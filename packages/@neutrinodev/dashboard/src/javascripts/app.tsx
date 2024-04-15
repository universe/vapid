import { initializeApp } from 'firebase/app';
import { render } from 'preact';

import { Dashboard, FirebaseAdapter } from './dashboard.js';
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
const adapter = new FirebaseAdapter(app, 'neutrino.dev', `websites/neutrino.dev`);

function App() {
  return <Dashboard root="/" adapter={adapter} />;
}

render(<App />, document.getElementById('main') as HTMLElement);
