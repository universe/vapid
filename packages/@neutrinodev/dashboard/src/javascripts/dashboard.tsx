import '@neutrinodev/stdlib/style.css';
import '../stylesheets/dashboard.css';
import './dashboard.css';

import { IRecord } from '@neutrinodev/core';
import { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import Router from 'preact-router';

import {
  DataAdapter,
  DataContextProvider,
  WebsiteRef,
  WebsiteSDKProvider,
} from './Data/index.js';
import Editor from './Editor/index.js';
import Preview from './Preview/index.js';

interface IDashboardProps {
  adapter: DataAdapter | null;
  root: string;
  embedded?: boolean;
  children?: ComponentChildren;
  sdk?: WebsiteRef;
  beforeDeploy?: () => Promise<boolean> | boolean;
  afterDeploy?: () => Promise<void> | void;
}

export function Dashboard({ adapter, sdk, embedded, children, root, beforeDeploy, afterDeploy }: IDashboardProps) {
  const [ localRecord, setLocalRecord ] = useState<IRecord | null>(null);

  useEffect(() => {
    document.body.classList.toggle('dashboard--embedded', embedded);
  }, [embedded]);

  if (!adapter) { return null; }

  return <DataContextProvider adapter={adapter}>
    <link rel="stylesheet" href="https://kit.fontawesome.com/05b8235ba3.css" crossorigin="anonymous" />
    <WebsiteSDKProvider sdk={sdk} active={localRecord} />
    <Router>
      <Editor
        embedded={embedded || false}
        path={`${root || ''}/:templateType?/:templateName?/:pageId?/:collectionId?`}
        active={localRecord}
        onChange={setLocalRecord}
        beforeDeploy={beforeDeploy}
        afterDeploy={afterDeploy}
      >
        {children}
      </Editor>
    </Router>
    <Preview record={localRecord} />
  </DataContextProvider>;
}

export { type IWebsiteSDK, type IWebsiteSDKMessage, DataAdapter, useWebsite } from './Data/index.js';
export * from '@neutrinodev/core';
export * from '@neutrinodev/runtime';
export * as stdlib from '@neutrinodev/stdlib';
