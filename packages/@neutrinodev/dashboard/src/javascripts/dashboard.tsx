import '@neutrinodev/stdlib/style.css';
import '../stylesheets/dashboard.css';
import './dashboard.css';

import { IRecord } from '@neutrinodev/core';
import { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import Router from 'preact-router';

import { DataAdapter } from './adapters/types.js';
import DeviceFrame from './DeviceFrame/index.js';
import Editor from './Editor/index.js';
import Preview from './Preview/index.js';
import WebsiteData from './theme.js';

interface IDashboardProps {
  adapter: DataAdapter | null;
  embedded?: boolean;
  children?: ComponentChildren; root: string;
  beforeDeploy?: () => Promise<boolean> | boolean;
  afterDeploy?: () => Promise<void> | void;
}

export function Dashboard({ embedded, adapter, children, root, beforeDeploy, afterDeploy }: IDashboardProps) {
  const [ localRecord, setLocalRecord ] = useState<IRecord | null>(null);

  useEffect(() => {
    document.body.classList.toggle('dashboard--embedded', embedded);
  }, [embedded]);

  if (!adapter) { return null; }
  return <WebsiteData adapter={adapter}>
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
    <DeviceFrame>
      <Preview record={localRecord} />
    </DeviceFrame>
  </WebsiteData>;
}

export { default as FirebaseAdapter } from './adapters/firebase.js';
export * from '@neutrinodev/core';
export * from '@neutrinodev/runtime';
export * as stdlib from '@neutrinodev/stdlib';
