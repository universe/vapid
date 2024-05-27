import { IRecord, Record as RecordModel } from '@neutrinodev/core';
import { IWebsiteSDKMessage, useWebsite, WebsiteRef } from '@neutrinodev/embed';
import { useContext, useEffect, useRef } from 'preact/hooks';

import { DataContext } from "./hooks.js";

export {
  type IWebsiteSDK,
  type IWebsiteSDKMessage,
  type WebsiteRef,
  useWebsite,
} from '@neutrinodev/embed';

export interface IWebsiteSDKProviderProps {
  active?: IRecord | null;
  sdk?: WebsiteRef;
}

export function WebsiteSDKProvider({ active, sdk }: IWebsiteSDKProviderProps) {
  const { adapter, theme } = useContext(DataContext);
  const adapterRef = useRef(adapter || null);
  const themeRef = useRef(theme || null);
  const activeRef = useRef(active || null);

  // Used so we don't need to keep re-binding SDK methods whever theme or active page changes.
  adapterRef.current = adapter || null;
  activeRef.current = active || null;
  themeRef.current = theme || null;

  // If no external SDK was provided, default to our own so the method binding happens.
  // Important since integrators may not need SDK acces inline, but still want parent
  // page postMessage calls to work.
  const defaultSdk = useWebsite();
  sdk = sdk || defaultSdk;

  useEffect(() => {
    async function onParentMessage(event: MessageEvent) {
      try {
        // Make sure we're not responding to something we shouldn't be.
        // if (event.origin !== import.meta.env.PLANCK_URL) { return; }
        const message = JSON.parse(event.data) as IWebsiteSDKMessage;
        if (!message.__NEUTRINO_SDK__) { return; }
        window.parent.postMessage({
          __NEUTRINO_SDK__: true,
          uid: message.uid,
          data: await sdk?.current?.[message.type]?.(),
        }, { targetOrigin: '*' });
      }
      catch (err) {
        console.error('INVALID MESSAGE', err);
      }
    }
    window.addEventListener('message', onParentMessage);
    return () => window.removeEventListener('message', onParentMessage);
  }, [sdk]);

  useEffect(() => {
    if (!sdk || !sdk.current) { return; }

    sdk.current.getPage = async() => {
      if (!adapterRef.current) { throw new Error('Invalid data adapter.'); }
      if (!activeRef.current) { return null; }
      const children = await adapterRef.current.getChildren(activeRef.current.id);
      const parent = await adapterRef.current.getRecordById(activeRef.current.parentId);
      return RecordModel.getMetadata(RecordModel.permalink(activeRef.current, parent), activeRef.current, children, parent) || null;
    };

    sdk.current.save = async() => {
      if (!adapterRef.current) { throw new Error('Invalid data adapter.'); }
      if (!activeRef.current) { throw new Error('No page selected.'); }
      await adapterRef.current.updateRecord(activeRef.current);
    };

    sdk.current.deploy = async() => {
      if (!adapterRef.current) { throw new Error('Invalid data adapter.'); }
      if (!activeRef.current) { throw new Error('No page selected.'); }
      if (!themeRef.current) { throw new Error('No active theme.'); }
      await adapterRef.current.deploy(themeRef.current, { [activeRef.current.id]: activeRef.current });
    };

    sdk.current.deployAll = async() => {
      if (!adapterRef.current) { throw new Error('Invalid data adapter.'); }
      if (!themeRef.current) { throw new Error('No active theme.'); }
      const records = await adapterRef.current.getAllRecords();
      await adapterRef.current.deploy(themeRef.current, records);
    };
  }, [ sdk, adapterRef, themeRef, activeRef ]);

  return null;
}