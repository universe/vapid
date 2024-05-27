import type { SerializedRecord } from '@neutrinodev/core';
import { Deferred, uuid } from '@universe/util';
import type { JSX, MutableRefObject, RefObject } from 'preact/compat';
import { useEffect, useId, useRef } from 'preact/hooks';

export enum IWebsiteSDKMessageTypes {
  GET_PAGE = 'getPage',
  SAVE = 'save',
  DEPLOY = 'deploy',
  DEPLOY_ALL = 'deployAll',
}

export interface IBaseWebsiteSDKMessage {
  __NEUTRINO_SDK__: boolean;
  uid: string;
  type: IWebsiteSDKMessageTypes;
}

export interface IWebsiteGetPageSDKMessage extends IBaseWebsiteSDKMessage {
  type: IWebsiteSDKMessageTypes.GET_PAGE;
  data: SerializedRecord;
}

export interface IWebsiteSaveSDKMessage extends IBaseWebsiteSDKMessage {
  type: IWebsiteSDKMessageTypes.SAVE;
  data: null;
}

export interface IWebsiteDeploySDKMessage extends IBaseWebsiteSDKMessage {
  type: IWebsiteSDKMessageTypes.DEPLOY;
  data: null;
}

export interface IWebsiteDeployAppSDKMessage extends IBaseWebsiteSDKMessage {
  type: IWebsiteSDKMessageTypes.DEPLOY_ALL;
  data: null;
}

export type IWebsiteSDKMessage = IWebsiteGetPageSDKMessage
 | IWebsiteSaveSDKMessage
 | IWebsiteDeploySDKMessage
 | IWebsiteDeployAppSDKMessage;

export interface IWebsiteSDK {
  getPage(): Promise<SerializedRecord | null>;
  save(): Promise<void>;
  deploy(): Promise<void>;
  deployAll(): Promise<void>;
}

export interface WebsiteSDKOptions {
  targetOrigin?: string;
}

export default class WebsiteSDK implements IWebsiteSDK {
  #el: HTMLIFrameElement;
  #options: WebsiteSDKOptions;
  #operations: Record<string, Deferred<unknown>> = {};

  constructor(input: string | HTMLIFrameElement, options: WebsiteSDKOptions) {
    this.#handleMessage = this.#handleMessage.bind(this);
    const el = typeof input === 'string' ? document.getElementById(input) as HTMLIFrameElement : input;
    if (el?.tagName !== 'IFRAME') { throw new Error('Invalid iFrame Element'); }
    this.#el = el;
    this.#options = options;
    window.addEventListener('message', this.#handleMessage);
  }

  static stop(instance: WebsiteSDK | null) {
    instance && window.removeEventListener('message', instance.#handleMessage);
  }

  #handleMessage = function(this: WebsiteSDK, event: Event) {
    const evt = event as MessageEvent<IWebsiteSDKMessage>; // For the typescript gods.
    if (!evt.data.__NEUTRINO_SDK__ || !evt.data.uid) { return; }
    if (this.#options.targetOrigin && evt.origin !== this.#options.targetOrigin) { return; }
    const operation = this.#operations[evt.data.uid];
    if (!operation) { throw new Error('Missing Operation'); }
    delete this.#operations[evt.data.uid];
    operation.resolve(evt.data.data);
  };

  #sendMessage<T extends IWebsiteSDKMessageTypes>(type: T): ReturnType<IWebsiteSDK[T]> {
    const uid = uuid();
    const deferred = this.#operations[uid] = new Deferred();
    setTimeout(() => {
      if (!this.#operations[uid]) { return; }
      delete this.#operations[uid];
      deferred.reject(new Error('Timeout'));
    }, 30000);
    this.#el?.contentWindow?.postMessage(JSON.stringify({
      __NEUTRINO_SDK__: true,
      uid,
      type,
    }), { targetOrigin: this.#options.targetOrigin || '*' });
    return deferred as ReturnType<IWebsiteSDK[T]>;
  }

  getPage() { return this.#sendMessage(IWebsiteSDKMessageTypes.GET_PAGE); }
  save() { return this.#sendMessage(IWebsiteSDKMessageTypes.SAVE); }
  deploy() { return this.#sendMessage(IWebsiteSDKMessageTypes.DEPLOY); }
  deployAll() { return this.#sendMessage(IWebsiteSDKMessageTypes.DEPLOY_ALL); }
}

const DefaultNeutrinoSDK: IWebsiteSDK = {
  getPage() { throw new Error('The Neutrino SDK ref must be passed to a Dashboard compontent.'); },
  save() { throw new Error('The Neutrino SDK ref must be passed to a Dashboard compontent.'); },
  deploy() { throw new Error('The Neutrino SDK ref must be passed to a Dashboard compontent.'); },
  deployAll() { throw new Error('The Neutrino SDK ref must be passed to a Dashboard compontent.'); },
};

export type WebsiteRef = MutableRefObject<IWebsiteSDK> | RefObject<IWebsiteSDK>;

export function useWebsite(): WebsiteRef { return useRef({ ...DefaultNeutrinoSDK }); }

export function NeutrinoWebsite(props: JSX.HTMLAttributes<HTMLIFrameElement> & { sdk?: WebsiteRef, id?: string }) {
  const defaultId = useId();
  const { id, sdk, src } = props;

  useEffect(() => {
    if (!sdk) { return; }
    let targetOrigin = '*';
    try {
      targetOrigin = new URL(String(src)).origin;
    }
    catch {
      console.warn('Invalid Neutrino Website URL');
    }
    const instance = sdk.current = new WebsiteSDK(id || defaultId, { targetOrigin });
    return () => { WebsiteSDK.stop(instance); };
  }, [ sdk, defaultId, id, src ]);

  return <iframe {...props} id={id || defaultId} />;
}