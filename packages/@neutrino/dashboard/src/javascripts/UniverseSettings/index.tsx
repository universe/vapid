import "./index.css";

import BillingPage from "@universe/aether/components/Billing";
import DomainsPage from "@universe/aether/components/DomainsPage";
import LogInForm from "@universe/aether/components/LogInForm";
import TeamPage from "@universe/aether/components/TeamPage";
import type { IMultiverseDocument, SubDomain } from '@universe/campaign';
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

async function postHeaders(user: User) {
  return { Authorization: `Bearer ${await user?.getIdToken()}`, 'Content-Type': 'application/json' };
}

export default function UniverseSettings({ app, user, realm, hidden, onClose }: UniverseSettingsProps) {
  const [ multiverse, setMultiverse ] = useState<IMultiverseDocument | null>(null);
  const [ authorization, setAuthorization ] = useState<string | null>(null);
  const [ active, setActive ] = useState<'account' | 'team' | 'billing' | 'domains' | 'languages'>('account');
  console.log(multiverse);
  useEffect(() => {
    if (!app || !user || !realm) { return; }
    setTimeout(async() => {
      setAuthorization(await user?.getIdToken());
      const firestore = getFirestore(app);
      return onSnapshot(doc(firestore, 'multiverse', realm), async(doc) => {
        const data = await doc.data() as IMultiverseDocument;
        data?.billing && (data.billing.invoices = (data.billing.invoices || {}));
        data && Object.keys(data).length && setMultiverse(data);
      });
    }, 5000);
  }, [ app, user, realm ]);

  return <section class={`universe-settings universe-settings--${hidden ? 'hidden' : 'visible'}`}>
    <nav class="universe-settings__nav">
      <figure class="universe-settings__account">
        <img class="universe-settings__account-image" src={`https://${realm}/app/photo`} />
        <h1 class="universe-settings__account-realm">{realm}</h1>
      </figure>
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
      <LogInForm serverUrl={import.meta.env.API_URL} app={app!} onEmailInput={console.log}  />
    </section>
    <section class={`universe-settings__section ${active === 'domains' ? 'universe-settings__section--active' : ''}`}>
      <DomainsPage apiUrl={import.meta.env.API_URL} realm={realm} campaign={multiverse ?? undefined} authorization={authorization} />
    </section>
    <section class={`universe-settings__section ${active === 'team' ? 'universe-settings__section--active' : ''}`}>
      <TeamPage campaign={multiverse} />
    </section>
    <section class={`universe-settings__section ${active === 'billing' ? 'universe-settings__section--active' : ''}`}>
      <BillingPage 
        stripeToken={import.meta.env.STRIPE_TOKEN || ''}
        campaignName={multiverse?.realm || ''}
        billing={multiverse?.billing ? { ...multiverse?.billing } : null}
        onAutoPay={async(autopay: boolean) => {
          if (!user || !realm || typeof autopay !== 'boolean') { return; }
          await window.fetch(`${import.meta.env.API_URL}/v1/money/card`, {
            method: "PUT",
            headers: await postHeaders(user),
            body: JSON.stringify({ autopay, realm }),
          }).then(res => res.json());
        }}
        onPayment={console.log}
        onPaymentMethod={async(id: string) => {
          if (!user) { return; }
          const data = await window.fetch(`${import.meta.env.API_URL}/v1/money/card`, {
            method: "POST",
            headers: await postHeaders(user),
            body: JSON.stringify({ paymentId: id, realm }),
          }).then(res => res.json());
          if (!data.data) { throw new Error('Error saving card.'); }
        }}
        onCardRemove={async() => {
          if (!user) { return; }
            return window.fetch(`${import.meta.env.API_URL}/v1/money/card`, {
              method: "DELETE",
              headers: await postHeaders(user),
            }).then(res => res.json());
        }}
      />
    </section>
  </section>;
}
