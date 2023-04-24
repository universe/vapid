import './app.css';
import 'preact/debug';
import 'preact/devtools';

import type { SubDomain } from '@universe/campaign';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged,User } from 'firebase/auth';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';

import Adapter from './adapters/firestore.js';
import { Dashboard } from './dashboard.js';
import Onboarding from './Onboarding/index.js';
import UniverseSettings from './UniverseSettings/index.js';

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
  const [ universeSettingsHidden, setUniverseSettingsHidden ] = useState(true);
  const [ claims, setClaims ] = useState<Record<string, Record<string, 1 | 0>>>({});

  // function userInitials(name: string) {
  //   const parts = name.split(' ');
  //   const firstName = parts[0];
  //   const lastName = parts.pop() || '';
  //   return `${firstName[0] || '?'}${lastName[0] || '?'}`;
  // }
  //
  // const [ localApp, setLocalApp ] = useState<FirebaseApp | null>(null);
  // const [ creds, setCreds ] = useState<{ realm: string, config: FirebaseOptions, token: string; projectId: string; } | null>(null);
  //
  // useEffect(() => {
  //   if (!realm) { return; }
  //   (async() => {
  //     const token = await user?.getIdToken();
  //     if (!token) { return; }
  //     const res = await fetch(`${import.meta.env.API_URL}/v1/auth/${realm}`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     setCreds((await res.json()).data);
  //   })();
  // }, [user, realm]);
  //
  // useEffect(() => {
  //   (async() => {
  //     if (!creds) { return; }
  //     const localApp = initializeApp(creds.config, creds.realm);
  //     const auth = getAuth(localApp);
  //     await signInWithCustomToken(auth, creds.token);
  //     setLocalApp(localApp);
  //   })();
  // }, [creds]);
  
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
    <UniverseSettings app={app || null} user={user} realm={realm} hidden={universeSettingsHidden} onClose={() => setUniverseSettingsHidden(true)} />
    {adapter && user ? <Dashboard root="" adapter={adapter}>
      <section class="universe__nav">
        <figure class="universe__account">
          <img class="universe__account-photo" onError={evt => (evt.target as HTMLImageElement).src = TRANSPARENT_PIXEL} src={`https://${realm}/app/photo`} />
          <h1 class="universe__title">{realm}</h1>
          <ul
            class="universe__account-picker" 
            onBlur={evt => setTimeout(() => (evt.target as HTMLElement).scrollTop = 0, 200)} 
            onMouseLeave={evt => setTimeout(() => (evt.target as HTMLElement).scrollTop = 0, 200)}
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
        
        {/* <button 
          class="universe__profile-image" 
          style={`--user-image: url(${user.photoURL || ''})`} 
          onClick={_ => setShowOnboarding(true)}
        >
          {userInitials(user.displayName || '')}
        </button> */}
        <button 
          class="universe__site-settings" 
          onClick={_ => setUniverseSettingsHidden(false)}
        >Site Settings</button>
      </section>
    </Dashboard> : null}
  </>;
}

render(<App />, document.getElementById('main') as HTMLElement);
