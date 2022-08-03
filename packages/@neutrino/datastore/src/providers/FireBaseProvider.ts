import { IProvider, IRecord, ITemplate, PageType, Template } from '@neutrino/core';
import { md5 } from '@universe/util';
import { deleteApp, FirebaseApp, FirebaseOptions,initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, signInWithCustomToken, signInWithEmailAndPassword, User } from 'firebase/auth';
import { collection, connectFirestoreEmulator, deleteDoc, doc, DocumentData, DocumentSnapshot, Firestore, getDoc, getDocs, initializeFirestore, query, QueryConstraint,setDoc, where } from 'firebase/firestore';
import { connectStorageEmulator,FirebaseStorage, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import mime from 'mime';
import pino from 'pino';

const logger = pino();
const ENV = globalThis?.process?.env || {};

export interface FireBaseProviderConfig {
  type: 'firebase';
  projectId?: string;
  config?: FirebaseOptions;
  scope?: string;
  app?: FirebaseApp | null;
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
    if (ENV.FIREBASE_STORAGE_EMULATOR_HOST) {
      logger.info(`Connecting Firebase Storage Emulator`);
      const [ domain, port ] = ENV.FIRESTORE_EMULATOR_HOST?.split(':') || [ 'localhost', '8081' ];
      connectStorageEmulator(this.#storage, domain, parseInt(port));
    }
    return this.#storage;
  }

  private getDatabase() {
    if (this.#db) return this.#db;
    this.#db = (this.#firebase && initializeFirestore(this.#firebase, { ignoreUndefinedProperties: true })) || null;
    if (!this.#db) { throw new Error('Problem connecting to database'); }
    if (ENV.FIRESTORE_EMULATOR_HOST) {
      logger.info(`Connecting Firebase Emulator`);
      const [ domain, port ] = ENV.FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(this.#db, domain, parseInt(port));
    }

    return this.#db;
  }

  async start() {
    logger.info(`Starting FireBase Provider`);
    const dbConfig = this.config.database;
    if (dbConfig.app) {
      this.#firebase = dbConfig.app;
    }
    else {
      let config = ENV.FIRESTORE_EMULATOR_HOST ? { projectId: dbConfig.projectId, apiKey: '123' } : dbConfig.config;
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
      this.#firebase = initializeApp(config, `vapid-${Math.floor(Math.random() * 100000)}`);
    }

    this.#auth = (this.#firebase && getAuth(this.#firebase)) || null;
    if (!this.#auth) { throw new Error('Problem connecting to authentication'); }
    if (ENV.FIREBASE_AUTH_EMULATOR_HOST) {
      logger.info(`Connecting Auth Emulator`);
      connectAuthEmulator(this.#auth, `http://${ENV.FIREBASE_AUTH_EMULATOR_HOST}`);
    }
    logger.info(`Firebase Provider Started`);
  }

  currentUser(): User | null {
    if (!this.#auth) { throw new Error(`Auth is Disconnected`); }
    return this.#auth.currentUser;
  }

  async signIn(username: string, password?: string): Promise<User | null> {
    if (!this.#auth) { throw new Error(`Auth is Disconnected`); }
    if (!password) {
      logger.info(`Logging In With User Token`);
      await signInWithCustomToken(this.#auth, username);
    }
    else {
      logger.info(`Logging In With Username and Password`);
      await signInWithEmailAndPassword(this.#auth, username, password);
    }
    return this.currentUser();
  }

  async stop() {
    logger.info('Stopping FireBase Provider');
    try {
      this.#firebase && await deleteApp(this.#firebase);
    }
 catch {
      logger.error(`App Already Deleted`);
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
    console.log(this.getRecordsPath());
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
    const filter = [ where('slug', '==', slug), parentId !== undefined ? where('parentId', '==', parentId) : undefined ].filter(Boolean) as QueryConstraint[];
    const data = await getDocs(query(collection(db, this.getRecordsPath()), ...filter));
    // TODO: Error if multiple results.
    return normalizeDocument(data.docs?.[0]);
  }

  async getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]> {
    const db = this.getDatabase();
    const filter = [ where('_type', '==', type), parentId !== undefined ? where('parentId', '==', parentId) : undefined ].filter(Boolean) as QueryConstraint[];
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

  async saveFile(name: string, file: Uint8Array) {
    const storage = this.getStorage();
    const ext = name.split('.').pop();
    const hash = md5(file.toString());
    const fileRef = ref(storage, `uploads/${hash}`);
    console.log('upload', hash, mime.getType(ext || ''), fileRef);
    const uploadTask = uploadBytesResumable(fileRef, file, { contentType: mime.getType(ext || '') || 'application/octet-stream' });

    // Listen for state changes, errors, and completion of the upload.
    return await new Promise<string | null>((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${  progress  }% done`);
          switch (snapshot.state) {
            case 'paused':
              console.log('Upload is paused');
              break;
            case 'running':
              console.log('Upload is running');
              break;
          }
        }, 
        (error) => {
          console.error(error);
          // A full list of error codes is available at
          // https://firebase.google.com/docs/storage/web/handle-errors
          reject(error.code);
        },
        () => resolve(`uploads/${hash}`),
      );
    });
  }
}
