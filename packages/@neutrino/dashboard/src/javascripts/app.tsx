import './app.css';
import 'preact/debug';
import 'preact/devtools';

import type { IMultiverseDocument,SubDomain } from '@universe/campaign';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged,User } from 'firebase/auth';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';

import Adapter from './adapters/firestore.js';
import { Dashboard } from './dashboard.js';
import Onboarding from './Onboarding/index.js';
import UniverseSettings, { UniverseSettingsPageIds } from './UniverseSettings/index.js';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
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

const app = initializeApp(UNIVERSE_APP_CONFIG);

function App() {
  const [ user, setUser ] = useState<User | null>(null);
  const [ realm, setRealm ] = useState<SubDomain | null>(null);
  const [ adapter, setAdapter ] = useState<Adapter | null>(null);
  const [ showOnboarding, setShowOnboarding ] = useState(false);
  const [ universeSettingsPage, setUniverseSettingsPage ] = useState<UniverseSettingsPageIds>(null);
  const [ claims, setClaims ] = useState<Record<string, Record<string, 1 | 0>>>({});
  const [ accountPickerIsOpen, setAccountPickerIsOpen ] = useState<boolean>(false);
  const [ multiverse, setMultiverse ] = useState<IMultiverseDocument | null>(null);
  
  useEffect(() => {
    const auth = getAuth(app);
    setUser(auth?.currentUser || null);
    return onAuthStateChanged(auth, async(user) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    (async() => {
      if (!user) { return; }
      await user?.getIdToken(true);
      const claims = ((await user?.getIdTokenResult())?.claims?.realms || {}) as Record<string, Record<string, 1 | 0>>;
      setClaims(claims);
      const realms = Object.keys(claims).sort().filter(r => !r.endsWith('.test'));
      let currentRealm = localStorage.getItem('realm') as (SubDomain | null) || realms[0] as SubDomain;
      if (!realms.includes(currentRealm)) { currentRealm = realms[0] as SubDomain; }
      setRealm(currentRealm);
    })();
  }, [user]);

  useEffect(() => {
    (async() => {
      if (!realm) { return; }
      localStorage.setItem('realm', realm);
      const adapter = new Adapter(app, realm.replace('.universe.app', '.campaign.win'), `websites/${realm}`);
      await adapter?.init();
      setAdapter(adapter);
      route('/page/index/index');
    })();
  }, [realm]);

  const hasSites = !!Object.keys(claims).length;
  const onboarding = !user || !hasSites || showOnboarding;
  return <>
    <Onboarding hidden={!onboarding} dismissable={!!(user && hasSites)} app={app || null} user={user} onComplete={async(realm: SubDomain) => {
      await user?.getIdToken(true);
      setClaims(((await user?.getIdTokenResult())?.claims?.realms || {}) as Record<string, Record<string, 1 | 0>>);
      setShowOnboarding(false);
      setRealm(realm);
    }} onCancel={() => setShowOnboarding(false)} />
    <UniverseSettings app={app || null} user={user} realm={realm} page={universeSettingsPage} onChange={(page) => setUniverseSettingsPage(page)} onMultiverse={setMultiverse} />
    {adapter && user ? <Dashboard root="" adapter={adapter} beforeDeploy={() => {
      if (!multiverse) { return false; }
      if (!multiverse?.billing?.paymentMethod) { 
        setUniverseSettingsPage('billing-alert');
        return false;
      }
      return true;
    }}>
      <section class="universe__nav">
        <figure class="universe__account">
          <img class="universe__account-photo" onError={evt => (evt.target as HTMLImageElement).src = TRANSPARENT_PIXEL} src={`https://${realm}/app/photo`} />
          <h1 class="universe__title">{realm}</h1>
          <ul
            tabIndex={-1}
            class={`universe__account-picker universe__account-picker--${accountPickerIsOpen ? 'open' : 'closed'}`} 
            onClick={(evt) => {
              setAccountPickerIsOpen(!accountPickerIsOpen);
              evt.currentTarget?.focus();
            }}
            onBlur={evt => {
              setAccountPickerIsOpen(false);
              (evt.target as HTMLElement).scrollTop = 0;
            }} 
          >
            {Object.keys(claims).filter(r => r === realm).map(realm => <li key={realm} class="universe__account-picker-row">
              <img class="universe__account-picker-photo" onError={evt => (evt.target as HTMLImageElement).src = TRANSPARENT_PIXEL} src={`https://${realm}/app/photo`} />
              <h2 class="universe__account-picker-name">{realm}</h2>
            </li>)}
            <li class="universe__account-picker-row" onClick={() => setShowOnboarding(true)}>
              <div class="universe__account-picker-photo">+</div>
              <h2 class="universe__account-picker-name">New Website</h2>
            </li>
            {Object.keys(claims)
              .sort()
              .filter(r => r !== realm)
              .map(realm => <li key={realm} onClick={() => { setRealm(realm as SubDomain);}} class="universe__account-picker-row">
                <img class="universe__account-picker-photo" onError={evt => (evt.target as HTMLImageElement).src = TRANSPARENT_PIXEL} src={`https://${realm}/app/photo`} />
                <h2 class="universe__account-picker-name">{realm}</h2>
              </li>)}
          </ul>
        </figure>
        <button 
          class="universe__site-settings" 
          onClick={_ => setUniverseSettingsPage('team')}
        >Site Settings</button>
      </section>
    </Dashboard> : null}
  </>;
}

render(<App />, document.getElementById('main') as HTMLElement);
