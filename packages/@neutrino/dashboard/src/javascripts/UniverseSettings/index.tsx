import "./index.css";

import type { IMultiverseDocument, SubDomain } from '@universe/admin';
import BillingPage from "@universe/aether/esm/src/components/Billing/index.js";
import LogInForm from "@universe/aether/esm/src/components/LogInForm";
import { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from "preact/hooks";

interface UniverseSettingsProps { 
  app: FirebaseApp | null;
  user: User | null;
  realm: SubDomain | null;
  hidden: boolean;
  onClose: () => void;
}

export default function UniverseSettings({ app, user, realm, hidden, onClose }: UniverseSettingsProps) {
  const [ multiverse, setMultiverse ] = useState<IMultiverseDocument | null>(null);
  const [ active, setActive ] = useState<'account' | 'team' | 'billing' | 'domains'>('account');
  useEffect(() => {
    if (!app || !user || !realm) { return; }
    const firestore = getFirestore(app);
    return onSnapshot(doc(firestore, 'multiverse', realm), async(doc) => {
      const data = await doc.data() as IMultiverseDocument;
      data && Object.keys(data).length && setMultiverse(multiverse);
    });
  }, [ app, user ]);

  return <section class={`universe-settings universe-settings--${hidden ? 'hidden' : 'visible'}`}>
    <nav class="universe-settings__nav">
      <ul class="universe-settings__menu">
        <li><button class="universe-settings__back" onClick={() => onClose()}>Back</button></li>
        <li class="universe-settings__menu-item">
          <button onClick={() => setActive('account')}class={`universe-settings__menu-link ${active === 'account' ? 'universe-settings__menu-link--active' : ''}`}>Account</button>
        </li>
        <li class="universe-settings__menu-item">
          <button onClick={() => setActive('domains')}class={`universe-settings__menu-link ${active === 'domains' ? 'universe-settings__menu-link--active' : ''}`}>Domains</button>
        </li>
        <li class="universe-settings__menu-item">
          <button onClick={() => setActive('team')}class={`universe-settings__menu-link ${active === 'team' ? 'universe-settings__menu-link--active' : ''}`}>Team</button>
        </li>
        <li class="universe-settings__menu-item">
          <button onClick={() => setActive('billing')}class={`universe-settings__menu-link ${active === 'billing' ? 'universe-settings__menu-link--active' : ''}`}>Billing</button>
        </li>
      </ul>
    </nav>
    <section class={`universe-settings__section ${active === 'account' ? 'universe-settings__section--active' : ''}`}>
      <h1 class="universe-settings__title">Account Settings</h1>
      <h2>Account: {multiverse?.realm || realm}</h2>
      <LogInForm serverUrl={import.meta.env.API_URL} redirectUrl={window.location.toString()} app={app!} onEmailInput={console.log}  />
    </section>
    <section class={`universe-settings__section ${active === 'domains' ? 'universe-settings__section--active' : ''}`}>
      <h1 class="universe-settings__title">Domain Settings</h1>
    </section>
    <section class={`universe-settings__section ${active === 'team' ? 'universe-settings__section--active' : ''}`}>
      <h1 class="universe-settings__title">Team Settings</h1>
    </section>
    <section class={`universe-settings__section ${active === 'billing' ? 'universe-settings__section--active' : ''}`}>
      <h1 class="universe-settings__title">Billing Settings</h1>
      <BillingPage 
        stripeToken="pk_test_jdorWHG5QRbN9xF9wX2HzjRp00dHfdca1k"
        campaignName="Name" 
        billing={multiverse?.billing || null} 
        onPaymentMethod={console.log} 
        onCardRemove={console.log} 
        onPrint={console.log} 
        onAutoPay={console.log} 
      />
    </section>
  </section>;
}
