import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword,getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { render } from 'preact';

import { Dashboard, DataAdapter } from './dashboard.js';
const UNIVERSE_APP_CONFIG = {
  apiKey: "AIzaSyCFeKSvsF0zqf_0LscDkP9zEbg2przyeMs",
  appId: "1:1079588234771:web:846d29434472418714c1e6",
  authDomain: "the-universe-app.firebaseapp.com",
  databaseURL: "https://the-universe-app.firebaseio.com",
  measurementId: "G-Z0KCBCDXJ6",
  messagingSenderId: "1079588234771",
  projectId: "the-universe-app",
  storageBucket: "the-universe-app.appspot.com",
};

const app = initializeApp(UNIVERSE_APP_CONFIG, 'vapid');
const adapter = new DataAdapter(app, 'neutrino.dev', `websites/neutrino.dev`);

// If we're emulating, set up our default fuxture.
// Run it async to let the adapter connect emulators first.
// This allows the in-report `docs` project to work out of the box.
// TODO: We need a more robust dev mode emulation!
if (import.meta.FIRESTORE_EMULATOR_HOST) {
  setTimeout(async () => {
    try { await createUserWithEmailAndPassword(getAuth(app), 'test@user.com', 'password'); }
    catch { 1; }
    await setDoc(doc(getFirestore(app), 'websites/neutrino.dev'), { domain: 'neutrino.app' }, { merge: true });
    await signInWithEmailAndPassword(getAuth(app), 'test@user.com', 'password');
  }, 1000);
}

function App() {
  return <Dashboard root="/" adapter={adapter} />;
}

render(<App />, document.getElementById('main') as HTMLElement);
