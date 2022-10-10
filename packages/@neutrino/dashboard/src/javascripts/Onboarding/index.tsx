/* eslint-disable max-len */
import './index.css';
import './imageUpload.css';

import { Pallette } from '@neutrino/stdlib/src/ColorHelper/index.js';
import type { SubDomain } from '@universe/admin';
import LogInForm from '@universe/aether/esm/src/components/LogInForm';
import Spinner from '@universe/aether/esm/src/components/Spinner';
import ColorThief from 'colorthief';
import file2md5 from 'file2md5';
import type { FirebaseApp } from "firebase/app";
import { getAuth, User } from 'firebase/auth';
import { doc,getFirestore, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, uploadString } from "firebase/storage";
import { ComponentChildren } from 'preact';
import { useEffect,useState } from 'preact/hooks';
import ReactTextTransition, { presets } from "react-text-transition";

import RocketButton from '../RocketButton/index.js';
import Browser from './Browser/index.js';
import loadingMessages from './loadingMessages.js';
import defaultRecords from './stamp.js';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const REALM = 'website.universe.app';

export type UploadFileFunction = {
  (file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  (file: File, name?: string): AsyncIterableIterator<UploadResult>;
}

interface IStepProps {
  active: boolean;
  onNext: () => void;
  onPrevious: () => void;
  uploadFile?: UploadFileFunction;
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (err: Error) => void };

const colorthief = new ColorThief();

function createDeferred<T>(): Deferred<T> {
  const d: Partial<Deferred<T>> = {};
  d.promise = new Promise((s, f) => { d.resolve = s; d.reject = f; });
  return d as Deferred<T>;
}

export type UploadResult = { status: 'pending'; progress: number; } 
| { status: 'paused'; progress: number; } 
| { status: 'success'; url: string; } 
| { status: 'error'; message: string; };
function uploadFile(app: FirebaseApp, file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
function uploadFile(app: FirebaseApp, file: File, name?: string): AsyncIterableIterator<UploadResult>;
async function * uploadFile(app: FirebaseApp, file: File | string, _type?: string, name?: string): AsyncIterableIterator<UploadResult> {
  const storage = getStorage(app, `gs://${REALM}`);
  yield { status: 'pending', progress: 50 };
  const md5 = name || await file2md5(file as File);
  const imageRef = ref(storage, `uploads/${md5}`);

  if (typeof file === 'string') {
    await uploadString(imageRef, file, 'data_url');
    yield { status: 'success', url: `https://${REALM}/uploads/${md5}` };
    return;
  }

  let deferred = createDeferred<UploadResult>();
  const uploadTask = uploadBytesResumable(imageRef, file, { contentType: file.type });

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
    () => deferred.resolve({ status: 'success', url: `https://${REALM}/uploads/${md5}` }),
  );

  while (true) {
    const res = await deferred.promise;
    yield res;
    if (res.status !== 'pending' && res.status !== 'paused') return;
  }
}

function LoginPanel({ app, visible, onClose }: { app: FirebaseApp | null; visible?: boolean; onClose: () => void }) {
  const auth = app ? getAuth(app) : null;
  const user = auth?.currentUser;
  const dismissable = !!user;
  return <section class={`onboarding__login ${visible === true ? 'onboarding__login--active' : ''} ${dismissable ? 'onboarding__login--dismissable' : ''}`}>
    <LogInForm serverUrl={import.meta.env.API_URL} redirectUrl={window.location.toString()} app={app!} onEmailInput={console.log} />
    <button onClick={() => onClose()} disabled={!user?.emailVerified} class="onbaording__login-dismiss">{user?.emailVerified ? 'Get Started!' : 'Verify Your Email'}</button>
  </section>;
}

function StepOne({ dismissable, active, onNext, subdomain, status, onChange, onCancel }: IStepProps & { dismissable: boolean; subdomain: string; status: true | null | string | number; onChange: (subdomain: string) => void; onCancel: () => void; }) {
  return <section class={`onboarding__step ${active ? 'onboarding__step--active' : ''} onboarding__step--${status === true ? 'success' : typeof status === 'number' ? 'pending' : 'error'}`}>
    <h1 class="onboarding__title">Select your Personal Sub-Domain</h1>
    <h2 class="onboarding__subtitle">This is where you'll go to edit your website. You can add a custom domain name later.</h2>
    <fieldset class="onboarding__subdomain">
      <div class="onboarding__subdomain-input-wrapper">
        {subdomain || 'website'}
        <input type="text" class="onboarding__subdomain-input" value={subdomain === 'website' ? '' : subdomain} onChange={evt => onChange((evt.target as HTMLInputElement).value.toLowerCase())} placeholder="website" />
      </div>
      .universe.app
    </fieldset>
    {typeof status === 'number' ? <label class="onboarding__subdomain-status"><Spinner size="small" />Checking name availability</label> : null}
    {typeof status === 'string' ? <label class="onboarding__subdomain-status">{status}</label> : null}
    {status === true ? <label class="onboarding__subdomain-status">Name is available!</label> : null}

    {dismissable ? <button class="onboarding__step-cancel" onClick={() => onCancel()}>Cancel</button> : null}
    <button class="onboarding__step-next" onClick={() => onNext()} disabled={!subdomain || status !== true}>Next</button>
  </section>;
}

function StepTwo({ active, onNext, onPrevious, theme, onChange }: IStepProps & { theme: string; onChange: (theme: string) => void; }) {
  return <section class={`onboarding__step ${active ? 'onboarding__step--active' : ''}`}>
    <h1 class="onboarding__title">Which homepage layout do you want?</h1>
    <h2 class="onboarding__subtitle">This will be your landing page layout. You can customize details later.</h2>
    <ul class="onboarding__themes">
      <li class="onboarding__theme">
        <input type="radio" name="theme" id="impact" value="impact" onChange={() => onChange('impact')} checked={theme === 'impact'} />
        <label class="onboarding__theme-button" for="impact">Impact</label>
      </li>
      <li class="onboarding__theme">
        <input disabled={true} type="radio" name="theme" id="progress" value="progress" onChange={() => onChange('progress')} checked={theme === 'progress'} />
        <label class="onboarding__theme-button" for="progress">Progress</label>
      </li>
      <li class="onboarding__theme">
        <input disabled={true} type="radio" name="theme" id="engage" value="engage" onChange={() => onChange('engage')} checked={theme === 'engage'} />
        <label class="onboarding__theme-button" for="engage">Engage</label>
      </li>
      <li class="onboarding__theme">
        <input disabled={true} type="radio" name="theme" id="connect" value="connect" onChange={() => onChange('connect')} checked={theme === 'connect'} />
        <label class="onboarding__theme-button" for="connect">Connect</label>
      </li>
    </ul>
    <button class="onboarding__step-prev" onClick={() => onPrevious()}>Back</button>
    <button class="onboarding__step-next" onClick={() => onNext()}>Next</button>
  </section>;
}

function StepThree({ src, onChange, active, onNext, onPrevious, uploadFile, onPallette }: IStepProps & { src: string; onChange: (src: string) => void; onPallette: (pallette: [number, number, number][]) => void }) {
  const [fileInputId] = useState(String(Math.floor(Math.random() * 1000)));
  const [ localBanner, setLocalBanner ] = useState<string | null>(null);
  const [ hexBanner, setHexBanner ] = useState<string | null>(null);
  const [ bannerUploadProgress, setBannerUploadProgress ] = useState<string | number | null>(null);
  useEffect(() => {
    setLocalBanner(src);
  }, [src]);
  return <section class={`onboarding__step ${active ? 'onboarding__step--active' : ''}`}>
    <h1 class="onboarding__title">Upload your logo</h1>
    <h2 class="onboarding__subtitle">We'll use this logo on your website.</h2>
    <div class={`article__image-upload image-upload--${localBanner ? 'image' : 'empty'}`}>
      <button class="image-upload__clear" onClick={() => { setLocalBanner(null); setBannerUploadProgress(null); (document.getElementById(fileInputId) as HTMLInputElement).value = ''; }}>Clear Image</button>
      <input type="file" id={fileInputId} onChange={async(evt: Event) => {
        const el = evt.target as HTMLInputElement;
        if (el.tagName.toLowerCase() !== 'input' || el.getAttribute('type') !== 'file') { return; }
        const reader = new FileReader();
        const file = el.files?.[0];
        if (!file) { return; }
        reader.onload = async(e) => {
          const src = (e.target?.result?.toString() || '');
          setLocalBanner(src);
          setHexBanner(src);
        };
        reader.readAsDataURL(file);
        for await (const progress of uploadFile?.(file) || []) {
          console.log(progress);
          switch (progress.status) {
            case 'pending': setBannerUploadProgress(progress.progress); break;
            case 'error': setBannerUploadProgress(progress.message); break;
            case 'success': setBannerUploadProgress(null); setLocalBanner(progress.url); onChange(progress.url); break;
          }
        }
      }} />
      {typeof bannerUploadProgress === 'number' ? <progress class="article__banner-image-progress" value={bannerUploadProgress} min="0" max="100" /> : null}
      {typeof bannerUploadProgress === 'string' ? <div class="article__banner-image-error">{bannerUploadProgress}</div> : null}
      <img class="article__image" onError={evt => (evt.target as HTMLImageElement).src = TRANSPARENT_PIXEL} src={localBanner || TRANSPARENT_PIXEL} />
      <img onLoad={evt => onPallette(colorthief?.getPalette(evt.target as HTMLImageElement, 5))} class="article__image-hidden" onError={evt => (evt.target as HTMLImageElement).src = TRANSPARENT_PIXEL} src={hexBanner || TRANSPARENT_PIXEL} />
    </div>
    <button class="onboarding__step-prev" onClick={() => onPrevious()}>Back</button>
    <button class="onboarding__step-next" onClick={() => onNext()}>{src ? 'Next' : 'Skip'}</button>
  </section>;
}

function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length == 1 ? `0${  hex}` : hex;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${  componentToHex(r)  }${componentToHex(g)  }${componentToHex(b)}`;
}

function StepFour({ primary, secondary, active, onChange, onPrevious, onSubmit, pallette }: IStepProps & { primary: string; secondary: string | null; onChange: (primary: string, cta: string | null) => void; onSubmit: (primary: string, cta: string) => void, pallette: [number, number, number][] }) {
  const [ defaultCta, setDefalutCta ] = useState<null | string>(null);
  const [ loading, setLoading ] = useState<boolean>(false);
  const [ loadingMessageIdx, setLoadingMessageIdx ] = useState(0);
  useEffect(() => {
    if (!secondary) {
      onChange(primary, defaultCta);
    }
  }, [ primary, secondary, defaultCta ]);
  const content = <section class="onboarding__content">
    <h1 class="onboarding__title">Customize your color palette.</h1>
      {
        pallette?.length 
        ? <h2 class="onboarding__subtitle">We've selected some color scheme options for you based on your logo. Feel free to customize them!</h2>
        : <h2 class="onboarding__subtitle">Customize your site's colors – go back and add a logo to get color recommendations!</h2>
      }

      <ul class="onboarding__pallette-suggestions">
        <li class="onboarding__pallette-label">Primary:</li>
        {pallette?.map((color, idx) => <li key={idx} class="onboarding__pallette-square" style={`background-color: ${rgbToHex(color[0], color[1], color[2])};`} onClick={() => onChange(rgbToHex(color[0], color[1], color[2]), secondary)} />)}
      </ul>
      <Pallette color={primary} cta={secondary} onChange={(hex) => onChange(hex, secondary)} onChangeCta={cta => onChange(primary, cta)} onDefaultCta={setDefalutCta} />
      <ul class="onboarding__pallette-suggestions">
        <li class="onboarding__pallette-label">Secondary:</li>
        {pallette?.map((color, idx) => <li key={idx} class="onboarding__pallette-square" style={`background-color: ${rgbToHex(color[0], color[1], color[2])};`} onClick={() => onChange(primary, rgbToHex(color[0], color[1], color[2]))} />)}
        <li><button class="onboarding__pallette-auto" style={{ backgroundColor: defaultCta, color: defaultCta }} onClick={() => onChange(primary, null)}>Auto</button></li>
      </ul>
      <button class="onboarding__step-prev" onClick={() => onPrevious()} />
  </section>;
  return <section class={`onboarding__step ${active ? 'onboarding__step--active' : ''} ${loading ? 'onboarding__step--loading' : ''}`}>
    {loading ? <section class="onboarding__loading" id="loading-message" data-idx={loadingMessageIdx}>
      <Spinner size="large" />
      <ReactTextTransition
        children={loadingMessages[loadingMessageIdx]}
        className="onboarding__loading-message"
        springConfig={presets.default}
        inline
      />
    </section> : content}
    <RocketButton onClick={() => { 
      setLoading(true); 
      setTimeout(() => {
        onSubmit(primary, secondary || defaultCta || primary);
      }, 5000);
      const interval = setInterval(() => {
        const el = document.getElementById('loading-message');
        if (!el) { clearInterval(interval); }
        setLoadingMessageIdx((parseInt(el?.getAttribute('data-idx') || '0') + 1) % loadingMessages.length);
      }, 2000);
    }} initialText="Launch New Site" finalText="New Site is Deploying" />
  </section>;
}

async function onSubmit(app: FirebaseApp | null, user: User | null, { realm, theme, logo, primary, cta }: OnboardingRequest): Promise<void> {
  if (!app || !user) { return; }
  const firestore = getFirestore(app);
  try {
    const res = await (await window.fetch(`${import.meta.env.API_URL}/v1/account/${realm}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user?.getIdToken()}`, 'Content-Type': 'application/json' },
    })).json();
    if (res.status !== 'success') { throw new Error(`Error creating new subdomain: ${res.message}`); }
  }
 catch (err) {
    console.error(err);
    return;
  }
  await user?.getIdToken(true);
  for (const record of defaultRecords) {
    if (record.templateId === 'design-settings') {
      record.content.color = { hex: primary, cta };
      record.content.theme = [theme];
      record.content.logo = {
        focus: { x: 0, y: 0 },
        src: logo || 'uploads/4dd6758486f61bcf22ff48f202a62bf5',
      };
    }
    await setDoc(doc(firestore, `websites/${realm}/records/${record.id}`), record);
  }
}

export interface OnboardingRequest {
  realm: string;
  theme: string;
  logo: string;
  primary: string;
  cta: string;
}

function userInitials(name: string) {
  const parts = name.split(' ');
  const firstName = parts[0];
  const lastName = parts.pop() || '';
  return `${firstName[0] || '?'}${lastName[0] || '?'}`;
}

export default function Onboarding({ app, user, children, onComplete, onCancel, hidden, dismissable }: { app: FirebaseApp | null; user: User | null, dismissable: boolean; children?: ComponentChildren, hidden?: boolean; onCancel: () => void; onComplete: (realm: SubDomain) => void; }) {
  const [ step, setStep ] = useState('one');
  const [ subdomain, setSubdomain ] = useState('');
  const [ theme, setTheme ] = useState('impact');
  const [ logo, setLogo ] = useState('');
  const [ hex, setHex ] = useState('#3781E2');
  const [ cta, setCta ] = useState<string | null>(null);
  const [ pallette, setPallette ] = useState<[number, number, number][]>([]);
  const [ subdomainValidation, setSubdomainValidation ] = useState<null | true | number | string>(null);
  const [ loginVisible, setLoginVisible ] = useState(false);

  useEffect(() => {
    if (!user || !subdomain || subdomain === 'website') {
      setSubdomainValidation(null);
      return; 
    }
    if (typeof subdomainValidation === 'number') { 
      clearTimeout(subdomainValidation);
    }
    setSubdomainValidation(setTimeout(async() => {
      const res = await (await window.fetch(`${import.meta.env.API_URL}/v1/account/${subdomain}.universe.app`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${await user?.getIdToken()}`, 'Content-Type': 'application/json' },
      })).json();
      console.log(res);
      if (res.status === 'success') {
        setSubdomainValidation('Domain name is already taken.');
      }
      else if (res.code === 401) {
        setSubdomainValidation('Auth error. Please refresh the page and try again.');
      }
      else if (res.code === 400) {
        setSubdomainValidation('Invalid domain name. Please only use characters a-z.');
      }
      else if (res.code === 404) {
        setSubdomainValidation(true);
      }
    }, 1000) as unknown as number);
  }, [subdomain]);

  const auth = app ? getAuth(app) : null;

  return <section class={`onboarding onboarding--${hidden ? 'hidden' : 'visible'}`}>
    <img class="onboarding__logo" src="https://universe.app/images/ViaMrlzrslISXuQ7SuKcIw" />
    {children || null}
    <button 
      class="universe__profile-image" 
      style={`--user-image: url(${user?.photoURL || ''})`} 
      onClick={_ => setLoginVisible(!loginVisible)}
    >
      {userInitials(user?.displayName || '')}
    </button>
    <LoginPanel app={app} onClose={() => setLoginVisible(false)} visible={!auth?.currentUser || !auth?.currentUser?.emailVerified || loginVisible} />
    <StepOne dismissable={dismissable} subdomain={subdomain} status={subdomainValidation} onChange={setSubdomain} onCancel={() => onCancel()} active={step === 'one'} onNext={() => setStep('two')} onPrevious={() => setStep('one')}  />
    <StepTwo theme={theme} onChange={setTheme} active={step === 'two'} onNext={() => setStep('three')} onPrevious={() => setStep('one')} />
    <StepThree src={logo} onPallette={setPallette} onChange={setLogo} active={step === 'three'} onNext={() => setStep('four')} onPrevious={() => setStep('two')} uploadFile={uploadFile.bind(null, app)} />
    <StepFour pallette={pallette} primary={hex} secondary={cta} onChange={(hex: string, cta: string | null) => { setHex(hex); setCta(cta); }} onSubmit={async(primary: string, cta: string) => {
      await onSubmit(app, user, {
        realm: `${subdomain}.universe.app`,
        theme,
        logo,
        primary,
        cta,
      });
      onComplete(`${subdomain}.universe.app`);
    }} active={step === 'four'} onNext={() => setStep('one')} onPrevious={() => setStep('three')} />
    <section class="onboarding__image">
      <Browser url={`https://${subdomain || 'website'}.campaign.win`} theme={theme} img={logo} hex={hex} cta={cta} />
    </section>
  </section>;
}
