import './app.css';

import LogInPanel from '@universe/aether/esm/src/components/LogInPanel';
import { FirebaseApp,FirebaseOptions, initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken,User } from 'firebase/auth';
import { render } from 'preact';
import { useEffect,useState } from 'preact/hooks';

import Adapter from './adapters/firestore.js';
import { Dashboard } from './dashboard.js';

// const PROJECT_ID = 'pa9f42fd97a6e4a6c9d95e7d3e440d';
const PROJECT_ID = 'the-universe-app';

function App() {
  const [ _, setApp ] = useState<FirebaseApp | null>(null);
  const [ user, setUser ] = useState<User | null>(null);
  const [ adapter, setAdapter ] = useState<Adapter | null>(null);
  const [ loginOpen, setLoginOpen ] = useState(true);
  const [ creds, setCreds ] = useState<{ realm: string, config: FirebaseOptions, token: string; projectId: string; } | null>(null);
  const [ claims, setClaims ] = useState<Record<string, Record<string, 1 | 0>>>({});
  console.log(claims);
  useEffect(() => {
    (async() => {
      if (!user) { return; }
      console.log('WOO', (await user?.getIdTokenResult()).claims);
      setClaims((await user?.getIdTokenResult()).claims.realms as Record<string, Record<string, 1 | 0>>);
      const token = await user?.getIdToken();
      if (!token) { return; }
      const res = await fetch('http://localhost:1337/v1/auth/demo.universe.app', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCreds((await res.json()).data);
    })();
  }, [user]);

  useEffect(() => {
    (async() => {
      if (!creds) { return; }
      const app = initializeApp(creds.config, creds.realm);
      const auth = getAuth(app);
      await signInWithCustomToken(auth, creds.token);
      const adapter = new Adapter(creds.projectId, app);
      await adapter?.init();
      setAdapter(adapter);
    })();
  }, [creds]);

  return <>
    <LogInPanel projectId={PROJECT_ID} open={loginOpen} onApp={setApp} onSignIn={setUser} onClose={() => user && setLoginOpen(false)} />
    {adapter && user ? <Dashboard root="" adapter={adapter}>
      <section class="universe__nav">
        <figure class="universe__account">
          <img class="universe__account-photo" src={`https://${creds?.realm}/app/photo`} />
          <h1 class="universe__title">{creds?.realm}</h1>
        </figure>

        <ul 
          class="universe__account-picker" 
          onBlur={evt => setTimeout(() => (evt.target as HTMLElement).scrollTop = 0, 200)} 
          onMouseLeave={evt => setTimeout(() => (evt.target as HTMLElement).scrollTop = 0, 200)}
        >
          {Object.keys(claims).filter(r => r === creds?.realm).map(realm => <li key={realm} class="universe__account-picker-row">
            <img class="universe__account-picker-photo" src={`https://${realm}/app/photo`} />
            <h2 class="universe__account-picker-name">{realm}</h2>
          </li>)}
          {Object.keys(claims).sort().filter(r => r !== creds?.realm).map(realm => <li key={realm} class="universe__account-picker-row">
            <img class="universe__account-picker-photo" src={`https://${realm}/app/photo`} />
            <h2 class="universe__account-picker-name">{realm}</h2>
          </li>)}
        </ul>
        <button 
          class="universe__profile-image" 
          style={`--user-image: url(${user.photoURL || ''})`} 
          onClick={_ => setLoginOpen(true)}
        >
          {userInitials(user.displayName || '')}
        </button>
      </section>
    </Dashboard> : null}
  </>;
}

function userInitials(name: string) {
  const parts = name.split(' ');
  const firstName = parts[0];
  const lastName = parts.pop() || '';
  return `${firstName[0] || '?'}${lastName[0] || '?'}`;
}

render(<App />, document.getElementById('main')!);
