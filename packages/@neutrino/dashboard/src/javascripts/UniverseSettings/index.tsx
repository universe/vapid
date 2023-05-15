import "./index.css";

import BillingPage from "@universe/aether/components/Billing";
import DomainsPage from "@universe/aether/components/DomainsPage";
import LogInForm from "@universe/aether/components/LogInForm";
import SubNavLink from "@universe/aether/components/SubNavLink";
import TeamPage from "@universe/aether/components/TeamPage";
import { getInvoiceId,IMultiverseDocument, Invoice, SubDomain } from '@universe/campaign';
import { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from "preact/hooks";

export type UniverseSettingsPageIds = 'account' | 'team' | 'billing' | 'domains' | 'languages' | 'billing-alert' | null;
export interface UniverseSettingsProps { 
  app: FirebaseApp | null;
  user: User | null;
  realm: SubDomain | null;
  page: UniverseSettingsPageIds;
  onChange: (page: UniverseSettingsPageIds) => void;
  onMultiverse?: (multiverse: IMultiverseDocument | null) => void;
}

async function postHeaders(user: User) {
  return { Authorization: `Bearer ${await user?.getIdToken()}`, 'Content-Type': 'application/json' };
}

export default function UniverseSettings({ app, user, realm, page, onChange, onMultiverse }: UniverseSettingsProps) {
  const [ multiverse, setMultiverse ] = useState<IMultiverseDocument | null>(null);
  const [ authorization, setAuthorization ] = useState<string | null>(null);

  useEffect(() => {
    if (!app || !user || !realm) { return; }
    const unsub: (() => void) | null = null;
    setTimeout(async() => {
      setAuthorization(await user?.getIdToken());
      const firestore = getFirestore(app);
      return onSnapshot(doc(firestore, 'multiverse', realm), async(doc) => {
        let data: IMultiverseDocument | null = await doc.data() as IMultiverseDocument;
        if (!data || !Object.keys(data).length) { data = null; }
        if (data?.billing) {
          data.billing.invoices = data.billing.invoices || {};
          const invoices = Object.values(data.billing.invoices || {}).sort((i1, i2) => {
            return i1.createdAt > i2.createdAt ? -1 : 1;
          });
          const thisMonth: Invoice = invoices[0] = invoices[0] || { createdAt: Date.now(), bills: {}, payments: [] };
          data.billing.invoices[getInvoiceId(new Date(thisMonth.createdAt))] = thisMonth;
          if (thisMonth) {
            thisMonth.bills = thisMonth.bills || {};
            thisMonth.bills.website = thisMonth.bills.website || {
              unitCost: data?.billing?.pricing?.website || 24,
              units: 1,
            };
            thisMonth.bills.website.units = 1;
          }
          invoices[0]?.bills?.website?.units;
        }
        onMultiverse?.(data);
        data && Object.keys(data).length && setMultiverse(data);
      });
    }, 3000);
    return unsub || undefined;
  }, [ app, user, realm ]);

  return <section class={`universe-settings universe-settings--${page ? 'visible' : 'hidden'}`}>
    <nav class="universe-settings__nav">
      <button class="universe-settings__account" onClick={() => onChange(null)}>
        <img class="universe-settings__account-image" src={`https://${realm}/app/photo`} />
        <h1 class="universe-settings__account-realm">{realm}</h1>
      </button>
      <LogInForm app={app!} onEmailInput={console.log}  />
      <ul class="universe-settings__menu">
        {/* <SubNavLink onClick={() => onChange('account')} isActive={page === 'account'}>Account</SubNavLink> */}
        <SubNavLink onClick={() => onChange('team')} isActive={page === 'team'}>Team</SubNavLink>
        <SubNavLink onClick={() => onChange('domains')} isActive={page === 'domains'}>Domains</SubNavLink>
        <SubNavLink onClick={() => onChange('billing')} isActive={page === 'billing'}>Billing</SubNavLink>
      </ul>
    </nav>
    <section class={`universe-settings__section ${page === 'billing-alert' ? 'universe-settings__section--active' : ''}`}>
      <h1 class="universe-settings__billing-alert-title">Looking good!</h1>
      <p class="universe-settings__billing-alert-subtitle ">Before your site can go live, we need to add a payment method on the billing page.</p>
      <button class="universe-settings__billing-alert-button" onClick={() => onChange('billing')}>Go To Billing</button> 
    </section>
    <section class={`universe-settings__section ${page === 'account' ? 'universe-settings__section--active' : ''}`} />
    <section class={`universe-settings__section ${page === 'domains' ? 'universe-settings__section--active' : ''}`}>
      <DomainsPage apiUrl={import.meta.env.API_URL} realm={realm} campaign={multiverse ?? undefined} authorization={authorization} />
    </section>
    <section class={`universe-settings__section ${page === 'team' ? 'universe-settings__section--active' : ''}`}>
      <TeamPage campaign={multiverse} />
    </section>
    <section class={`universe-settings__section ${page === 'billing' ? 'universe-settings__section--active' : ''}`}>
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
            body: JSON.stringify({ realm }),
          }).then(res => res.json());
        }}
      />
    </section>
    <button class="universe-settings__skrim" onClick={() => onChange(null)}>Close</button>
  </section>;
}
