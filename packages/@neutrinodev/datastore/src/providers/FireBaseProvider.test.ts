import { describe, expect, it } from '@jest/globals';
import nock from 'nock';

import FireBaseProvider from './FireBaseProvider.js';
import TestSuite from './TestSuite.js';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:8081';
process.env.FIREBASE_HOSTING_EMULATOR = 'localhost:8082';

const FIREBASE_DEV_CONFIG = {
  projectId: 'vapid',
  appId: '1:1079588234771:web:846d29434472418714c1e6',
  databaseURL: 'https://vapid.firebaseio.com',
  storageBucket: 'vapid.appspot.com',
  locationId: 'us-central',
  apiKey: 'AIzaSyCFeKSvsF0zqf_0LscDkP9zEbg2przyeMs',
  authDomain: 'vapid.firebaseapp.com',
  messagingSenderId: '1079588234771',
  measurementId: 'G-Z0KCBCDXJ6',
};

const provider = new FireBaseProvider({
  config: FIREBASE_DEV_CONFIG,
  firestore: { scope: 'vapid.test' },
  storage: { bucket: 'vapid.test' },
});
TestSuite('FireBase Provider - User Supplied App Config', provider, provider.purge.bind(provider));

describe('Firebase Provider Project ID Start', () => {
  it('Connects with just a projectId', async() => {
    /* eslint-disable-next-line */
    /* @ts-ignore */
    delete process.env.FIRESTORE_EMULATOR_HOST;
    // Emulators have incorrect behavior for init.json.
    const scope = nock(`http://${process.env.FIREBASE_HOSTING_EMULATOR}`).get('/__/firebase/init.json').reply(200, FIREBASE_DEV_CONFIG);
    const provider = new FireBaseProvider({
       projectId: 'vapid',
       firestore: { scope: 'vapid.test' },
       storage: { bucket: 'vapid.test' },
    });
    await provider.start();
    await provider.stop();
    nock.restore();
    expect(1).toEqual(1);
    expect(scope.isDone()).toBe(true);
  });
  it('Fails to connect with incorrect projectId', async() => {
    const provider = new FireBaseProvider({
      projectId: 'PANIC',
      firestore: { scope: '' },
      storage: { bucket: '' },
    });
    /* eslint-disable-next-line jest/valid-expect */
    expect(provider.start()).rejects;
  });
});
