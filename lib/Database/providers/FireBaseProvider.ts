import pino from 'pino';
import fetch from 'node-fetch';
import { FirebaseApp, initializeApp, deleteApp, FirebaseOptions } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, DocumentSnapshot, DocumentData, doc, deleteDoc, where, Firestore, initializeFirestore, getDoc, query, collection, getDocs, setDoc, QueryConstraint } from 'firebase/firestore';
import { FirebaseStorage, getStorage, ref, uploadBytes, connectStorageEmulator } from "firebase/storage";
import mime from 'mime';
import * as path from 'path';
import * as crypto from 'crypto';

import { PageType, ITemplate, IRecord, Template  } from '../models';
import { IProvider } from './types';

const logger = pino();

export interface FireBaseProviderConfig {
  type: 'firebase';
  projectId?: string;
  config?: FirebaseOptions;
  scope?: string;
  token?: string | null;
  username?: string | null;
  password?: string | null;
}

function normalizeDocument(doc: DocumentSnapshot<DocumentData> | undefined | null): IRecord | null {
  if (!doc) { return null; }
  const data = doc.data();
  delete data?._type;
  data && (data.id = doc.id);
  return (data as unknown as IRecord) || null;
}

function normalizeTemplate(doc: DocumentSnapshot<DocumentData> | undefined | null): ITemplate | null {
  if (!doc) { return null; }
  return doc.data() as unknown as ITemplate || null;
}

export default class FireBaseProvider extends IProvider<FireBaseProviderConfig> {
  private getFirebasePrefix() {
    logger.info(this.config.database.scope || `websites/${this.config.domain || 'default'}`);
    return this.config.database.scope || `websites/${this.config.domain || 'default'}`;
  }
  private getTemplatesPath() { return `${this.getFirebasePrefix()}/templates`; }
  private getRecordsPath() { return `${this.getFirebasePrefix()}/records`; }

  #firebase: FirebaseApp | null = null;
  #auth: Auth | null = null;
  #db: Firestore | null = null;
  #storage: FirebaseStorage | null = null;

  private getStorage() {
    if (this.#storage) { return this.#storage; }
    this.#storage = this.#firebase ? getStorage(this.#firebase, `gs://${this.config.domain}`) : null;
    if (!this.#storage) { throw new Error('Problem connecting to file storage'); }
    if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
      logger.info(`Connecting Firebase Storage Emulator`);
      const [ domain, port ] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
      connectStorageEmulator(this.#storage, domain, parseInt(port));
    }
    return this.#storage;
  }

  private getDatabase() {
    if (this.#db) return this.#db;
    this.#db = (this.#firebase && initializeFirestore(this.#firebase, { ignoreUndefinedProperties: true })) || null;
    if (!this.#db) { throw new Error('Problem connecting to database'); }
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      logger.info(`Connecting Firebase Emulator`);
      const [ domain, port ] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(this.#db, domain, parseInt(port));
    }

    return this.#db;
  }

  async start() {
    logger.info(`Starting FireBase Provider`);
    const dbConfig = this.config.database;
    logger.info(process.env.FIRESTORE_EMULATOR_HOST);
    let config = process.env.FIRESTORE_EMULATOR_HOST ? { projectId: dbConfig.projectId, apiKey: '123' } : dbConfig.config;
    if (!config && dbConfig.projectId) {
      const configHost = `https://${dbConfig.projectId}.firebaseapp.com`;
      const configPath = `${configHost}/__/firebase/init.json`;
      try {
        config = await (await fetch(configPath)).json() as FirebaseOptions;
      }
      catch {
        throw new Error(`Error fetching Firebase app config from projectId (${configPath}).`);
      }
    }
    if (!config) { throw new Error('Firebase app config is required.'); }

    logger.info(`Initializing Firebase App`);
    logger.info(config);
    this.#firebase = initializeApp(config, `vapid-${Math.floor(Math.random() * 100000)}`);
    this.#auth = (this.#firebase && getAuth(this.#firebase)) || null;
    if (!this.#auth) { throw new Error('Problem connecting to authentication'); }

    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      logger.info(`Connecting Auth Emulator`);
      connectAuthEmulator(this.#auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
    }
    else if (dbConfig.token) {
      logger.info(`Logging In With User Token`);
      await signInWithCustomToken(this.#auth, dbConfig.token);
    }
    else if (dbConfig.username && dbConfig.password) {
      logger.info(`Logging In With Username and Password`);
      await signInWithEmailAndPassword(this.#auth, dbConfig.username, dbConfig.password);
    }
    else {
      logger.info(`Logging In Anonymously`);
      await signInAnonymously(this.#auth);
    }
    logger.info(`Firebase Provider Started`);
  }

  async stop() {
    logger.info('Stopping FireBase Provider');
    try {
      this.#firebase && await deleteApp(this.#firebase);
    } catch {
      logger.error(`App Already Deleted`)
    }
  }

  async purge() {
    const db = this.getDatabase();
    const templates = await getDocs(collection(db, this.getTemplatesPath()));
    const records = await getDocs(collection(db, this.getRecordsPath()));
    const work = [];
    for (const tmpl of templates.docs) { work.push(deleteDoc(tmpl.ref)); }
    for (const record of records.docs) { work.push(deleteDoc(record.ref)); }
    await Promise.all(work);
    logger.info('Database Purged');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async getAllTemplates(): Promise<ITemplate[]> {
    const db = this.getDatabase();
    const data = await getDocs(collection(db, this.getTemplatesPath()));
    return data.docs.map(doc => normalizeTemplate(doc)).filter(Boolean) as ITemplate[];
  }

  async getAllRecords(): Promise<IRecord[]> {
    const db = this.getDatabase();
    const data = await getDocs(collection(db, this.getRecordsPath()));
    return data.docs.map(doc => normalizeDocument(doc)).filter(Boolean) as IRecord[];
  }

  async getTemplateById(id: string): Promise<ITemplate | null> {
    if (!id) { return null; }
    const db = this.getDatabase();
    const data = await getDoc(doc(db, `${this.getTemplatesPath()}/${id}`));
    return normalizeTemplate(data) || null;
  }

  async getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> {
    const db = this.getDatabase();
    const data = await getDocs(query(collection(db, this.getTemplatesPath()), where('name', '==', name), where('type', '==', type)));
    // TODO: Error if multiple results.
    return normalizeTemplate(data.docs?.[0]) || null;
  }

  async getTemplatesByType(type: PageType): Promise<ITemplate[]> {
    const db = this.getDatabase();
    const data = await getDocs(query(collection(db, this.getTemplatesPath()), where('type', '==', type)));
    return data.docs.map(doc => normalizeTemplate(doc)).filter(Boolean) as ITemplate[];
  }

  async getRecordById(id: string): Promise<IRecord | null> {
    if (!id) { return null; }
    const db = this.getDatabase();
    const data = await getDoc(doc(db, `${this.getRecordsPath()}/${id}`));
    return normalizeDocument(data);
  }

  async getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null> {
    const db = this.getDatabase();
    const filter = [where('slug', '==', slug), parentId !== undefined ? where('parentId', '==', parentId) : undefined].filter(Boolean) as QueryConstraint[];
    const data = await getDocs(query(collection(db, this.getRecordsPath()), ...filter));
    // TODO: Error if multiple results.
    return normalizeDocument(data.docs?.[0]);
  }

  async getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]> {
    const db = this.getDatabase();
    const filter = [where('_type', '==', type), parentId !== undefined ? where('parentId', '==', parentId) : undefined].filter(Boolean) as QueryConstraint[];
    const data = await getDocs(query(collection(db, this.getRecordsPath()), ...filter));
    return data.docs.map(doc => normalizeDocument(doc)).filter(Boolean) as IRecord[];
  }

  async getRecordsByTemplateId(id: string): Promise<IRecord[]> {
    const db = this.getDatabase();
    const data = await getDocs(query(collection(db, this.getRecordsPath()), where('templateId', '==', id)));
    return data.docs.map(doc => normalizeDocument(doc)).filter(Boolean) as IRecord[];
  }


  async getChildren(id: string): Promise<IRecord[]> {
    const db = this.getDatabase();
    const data = await getDocs(query(collection(db, this.getRecordsPath()), where('parentId', '==', id)));
    return data.docs.map(doc => normalizeDocument(doc)).filter(Boolean) as IRecord[];
  }

  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateTemplate(update: ITemplate): Promise<ITemplate> {
    const db = this.getDatabase();
    await setDoc(doc(db, `${this.getTemplatesPath()}/${Template.id(update)}`), update);
    return update;
  }

  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateRecord(update: IRecord): Promise<IRecord> {
    const db = this.getDatabase();
    const template = await this.getTemplateById(update.templateId);
    if (!template) {
      try {
        throw new Error(`Error creating record. Unknown template id "${update.templateId}"`);
      }
      catch (err) {
        logger.error(err);
        throw err;
      }
    }

    await setDoc(doc(db, `${this.getRecordsPath()}/${update.id}`), { ...update, _type: template.type });
    return update;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const db = this.getDatabase();
    await deleteDoc(doc(db, `${this.getTemplatesPath()}/${templateId}`));
  }

  async deleteRecord(recordId: string): Promise<void> {
    const db = this.getDatabase();
    await deleteDoc(doc(db, `${this.getRecordsPath()}/${recordId}`));
  }

  async mediaUrl(name?: string): Promise<string> {
    return `https://${this.config.domain}/${name || ''}`.replace(/\/$/, '');
  }

  async saveFile(name: string, file: NodeJS.ReadableStream) {
    const storage = this.getStorage();
    const ext = path.extname(name);
    const buff: Buffer[] = [];
    const hash = await new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      file.on('error', err => reject(err));
      file.on('data', chunk => { hash.update(chunk); buff.push(chunk) });
      file.on('end', () => resolve(hash.digest('hex')));
    });
    const buffer = Buffer.concat(buff);
    const fileRef = ref(storage, `uploads/${hash}`);
    const uploadTask = await uploadBytes(fileRef, Uint8Array.from(buffer), { contentType: mime.getType(ext) || 'application/octet-stream' });
    return uploadTask.ref.fullPath;
  }
}
