import { FileHeaders, IProvider, IRecord, IWebsite, PageType, UploadResult } from '@neutrinodev/core';
import { Deferred, md5 } from '@universe/util';
import file2md5 from 'file2md5';
import { deleteApp, FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, User } from 'firebase/auth';
import { 
  collection, 
  connectFirestoreEmulator, 
  deleteDoc, 
  doc, 
  DocumentData, 
  DocumentSnapshot,
  Firestore, 
  getDoc, 
  getDocs, 
  getFirestore,
  initializeFirestore,
  onSnapshot,
  setDoc, 
} from 'firebase/firestore';
import { connectStorageEmulator, deleteObject, FirebaseStorage, getStorage, ref, uploadBytesResumable, uploadString } from "firebase/storage";
import mime from 'mime';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const ENV = import.meta.env || globalThis?.process?.env || {};
const DEFAULT_STORAGE_ROOT = 'uploads';

export interface FireBaseStorageConfig {
  bucket: string;
  root?: string;
}

export interface FireBaseFirestoreConfig {
  scope: string;
}

export interface FireBaseProviderConfig {
  app?: FirebaseApp | null;
  projectId?: string;
  config?: FirebaseOptions;
  firestore: FireBaseFirestoreConfig;
  storage: FireBaseStorageConfig;
}

function normalizeDocument(doc: DocumentSnapshot<DocumentData> | undefined | null): IRecord | null {
  if (!doc) { return null; }
  const data = doc.data();
  delete data?._type;
  data && (data.id = doc.id);
  return (data as unknown as IRecord) || null;
}

type IDeferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (err: Error) => void };

function createDeferred<T>(): IDeferred<T> {
  const d: Partial<IDeferred<T>> = {};
  d.promise = new Promise((s, f) => { d.resolve = s; d.reject = f; });
  return d as IDeferred<T>;
}

export default class FireBaseProvider extends IProvider {
  private config: FireBaseProviderConfig;
  constructor(config: FireBaseProviderConfig) {
    super();
    this.config = config;
  }

  private getFirestorePrefix() {
    return this.config?.firestore?.scope || 'websites/default';
  }
  private getRecordsPath() { return `${this.getFirestorePrefix()}/records`; }

  // Firebase Connections
  #firebase: FirebaseApp | null = null;
  #auth: Auth | null = null;
  #db: Firestore | null = null;
  #storage: FirebaseStorage | null = null;

  // Firebase Watchers
  #websiteWatcher: (() => void) | null = null;
  #recordWatcher: (() => void) | null = null;

  // Cached Data
  #metadata: IWebsite | Deferred<IWebsite> = new Deferred<IWebsite>();
  #records: Record<string, IRecord> | Deferred<Record<string, IRecord>> = new Deferred<Record<string, IRecord>>();

  private getStorage() {
    if (this.#storage) { return this.#storage; }
    this.#storage = this.#firebase ? getStorage(this.#firebase, `gs://${this.config.storage.bucket}`) : null;
    if (!this.#storage) { throw new Error('Problem connecting to file storage'); }
    if (ENV.FIREBASE_STORAGE_EMULATOR_HOST) {
      logger.info(`Connecting Firebase Storage Emulator`);
      const [ domain, port ] = ENV.FIRESTORE_EMULATOR_HOST?.split(':') || [ 'localhost', '8081' ];
      connectStorageEmulator(this.#storage, domain, parseInt(port, 10));
    }
    return this.#storage;
  }

  private getDatabase() {
    if (this.#db) return this.#db;
    try {
      this.#db = (this.#firebase && initializeFirestore(this.#firebase, { ignoreUndefinedProperties: true })) || null;
    }
    catch {
      this.#db = (this.#firebase && getFirestore(this.#firebase)) || null;
    }
    if (!this.#db) { throw new Error('Problem connecting to database'); }
    if (ENV.FIRESTORE_EMULATOR_HOST) {
      logger.info(`Connecting Firebase Emulator`);
      const [ domain, port ] = ENV.FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(this.#db, domain, parseInt(port, 10));
    }

    return this.#db;
  }

  async start() {
    logger.info(`Starting FireBase Provider`);
    const dbConfig = this.config;
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
        catch (err) {
          console.error(err);
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
    onAuthStateChanged(this.#auth, user => {
      if (!user || user?.isAnonymous) { return; }
      this.watch();
    });
    logger.info(`Firebase Provider Started`);
  }

  currentUser(): User | null {
    if (!this.#auth) { throw new Error(`Auth is Disconnected`); }
    return this.#auth.currentUser;
  }

  private async watch() {
    const db = this.getDatabase();
    if (!(await getDoc(doc(db, this.getFirestorePrefix())))?.exists()) {
      throw new Error(`Website "${this.getFirestorePrefix()}" does not exist.`);
    }

    this.#websiteWatcher = onSnapshot(doc(db, this.getFirestorePrefix()), (res) => {
      const data = res.data() || {} as Partial<IWebsite>;
      const out: IWebsite = {
        name: data.name || '',
        domain: data.domain || '',
        media: `https://${data.domain}`,
        theme: data.theme || { name: 'neutrino', version: 'latest' },
        env: data.env || {},
      };
      if (this.#metadata instanceof Deferred) { this.#metadata.resolve(out); }
      this.#metadata = out;
      this.trigger('website');
    }, () => {
      this.trigger('website');
      throw new Error('Error Reading Website Config');
    });

    this.#recordWatcher = onSnapshot(collection(db, this.getRecordsPath()), (data) => {
      const records = data.docs.map(doc => normalizeDocument(doc)).filter(Boolean) as IRecord[];
      if (this.#records instanceof Deferred) {
        const out: Record<string, IRecord> = {};
        for (const record of records) {
          out[record.id] = record;
        }
        this.#records.resolve(out);
        this.#records = out;
      }
      else {
        for (const record of records) {
          this.#records[record.id] = record;
        }
      }
      this.trigger('records');
    });

    // All of the deferrables will resolve on first snapshot!
    await Promise.allSettled([
      this.#metadata,
      this.#records,
    ]);
  }

  private async unwatch() {
    this.#websiteWatcher?.();
    this.#recordWatcher?.();
    this.#metadata = new Deferred();
    this.#records = new Deferred();
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
    await this.unwatch();
    try {
      this.#firebase && await deleteApp(this.#firebase);
    }
    catch {
      logger.error(`App Already Deleted`);
    }
  }

  async purge() {
    const db = this.getDatabase();
    const records = await getDocs(collection(db, this.getRecordsPath()));
    const work = [];
    for (const record of records.docs) { work.push(deleteDoc(record.ref)); }
    await Promise.all(work);
    logger.info('Database Purged');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async getWebsite(): Promise<IWebsite> {
    return structuredClone(await this.#metadata);
  }

  async getAllRecords(): Promise<Record<string, IRecord>> {
    return structuredClone(await this.#records);
  }

  async getRecordById(id: string): Promise<IRecord | null> {
    const data = await this.#records;
    return data[id] || null;
  }

  async getRecordBySlug(slug: string, parentId?: string | null): Promise<IRecord | null> {
    const data = await this.#records;
    for (const record of Object.values(data)) {
      if (parentId ? record.parentId === parentId : true && record.slug === slug) {
        return record;
      }
    }
    return null;
  }

  async getRecordsByType(type: PageType, parentId?: string | null): Promise<IRecord[]> {
    const data = await this.#records;
    return Object.values(data).filter(t => t?.templateId.endsWith(type) && (parentId ? t?.parentId === parentId : true));
  }

  async getRecordsByTemplateId(templateId: string): Promise<IRecord[]> {
    const data = await this.#records;
    return Object.values(data).filter(t => t?.templateId === templateId);
  }

  async getChildren(parentId: string): Promise<IRecord[]> {
    const data = await this.#records;
    return Object.values(data).filter(t => t?.parentId === parentId);
  }

  /**
   * Update a section's attributes
   * Primarily used by the Vapid module when rebuilding the site
   */
  async updateRecord(update: IRecord): Promise<IRecord> {
    const db = this.getDatabase();
    await setDoc(doc(db, `${this.getRecordsPath()}/${update.id}`), { ...update });
    return update;
  }

  async deleteRecord(recordId: string): Promise<void> {
    const db = this.getDatabase();
    await deleteDoc(doc(db, `${this.getRecordsPath()}/${recordId}`));
  }

  async mediaUrl(name?: string): Promise<string> {
    const site = await this.getWebsite();
    return `https://${site.domain}/${name || ''}`.replace(/\/$/, '');
  }

  saveFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  saveFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  async * saveFile(file: File | string, type?: string, name?: string): AsyncIterableIterator<UploadResult> {
    yield { status: 'pending', progress: 0 };
    const storage = this.getStorage();
    const hash = file instanceof File ? await file2md5(file) : md5(file.toString());
    const filePath = `${this.config?.storage?.root || DEFAULT_STORAGE_ROOT}/${hash}`;
    const fileRef = ref(storage, filePath);
    const mimeType = name ? type : (file as File).type;
    name = name || type;
    const ext = name?.split('.')?.pop() || '';
    const contentType = mimeType || mime.getType(ext) || 'application/octet-stream';
    const url = await this.mediaUrl(filePath);
    if (typeof file === 'string') {
      await uploadString(fileRef, file, 'data_url', {
        contentType,
      });
      yield { status: 'success', url };
      return;
    }

    let deferred = createDeferred<UploadResult>();
    const uploadTask = uploadBytesResumable(fileRef, file, { contentType });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        const prevDeferred = deferred;
        deferred = createDeferred<UploadResult>();
        if (snapshot.state === 'paused') prevDeferred.resolve({ status: 'paused', progress });
        if (snapshot.state === 'running') prevDeferred.resolve({ status: 'pending', progress });
      },
      (error) => deferred.resolve({ status: 'error', message: error.message }),
      () => deferred.resolve({ status: 'success', url }),
    );

    while (true) {
      const res = await deferred.promise;
      yield res;
      if (res.status !== 'pending' && res.status !== 'paused') return;
    }
  }

  async deleteFile(path: string): Promise<void> {
    const storage = this.getStorage();
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  }

  async * deployFile(path: string, blob: Blob, headers: FileHeaders): AsyncIterableIterator<UploadResult> {
    yield { status: 'pending', progress: 0 };
    const storage = this.getStorage();
    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, blob, headers);
    let deferred = createDeferred<UploadResult>();
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        const prevDeferred = deferred;
        deferred = createDeferred<UploadResult>();
        if (snapshot.state === 'paused') prevDeferred.resolve({ status: 'paused', progress });
        if (snapshot.state === 'running') prevDeferred.resolve({ status: 'pending', progress });
      },
      (error) => deferred.resolve({ status: 'error', message: error.message }),
      () => deferred.resolve({ status: 'success', url: `https://${this.config.storage.bucket}/${path}` }),
    );

    while (true) {
      const res = await deferred.promise;
      yield res;
      if (res.status !== 'pending' && res.status !== 'paused') return;
    }
  }
}
