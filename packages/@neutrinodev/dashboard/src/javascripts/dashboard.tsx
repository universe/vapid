import '@neutrinodev/stdlib/style.css';
import '../stylesheets/dashboard.css';
import './dashboard.css';

import { IRecord, mergeAnchor } from '@neutrinodev/core';
import { IRenderResult } from '@neutrinodev/runtime';
import jsonStringify from 'fast-json-stable-stringify';
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
  const [ renderResult, setRenderResult ] = useState<IRenderResult | null>(null);

  useEffect(() => {
    document.body.classList.toggle('dashboard--embedded', embedded);
  }, [embedded]);

  useEffect(() => {
    if (!localRecord || !Object.values(renderResult?.anchors || {}).length) { return; }

    // Ensure our local record has an anchors hash, and grab all exisitng keys pre-processing.
    localRecord.anchors = localRecord.anchors || {};
    const keys = new Set(Object.keys(localRecord.anchors || {}));

    // Ensure the anchors hash has all currently rendered anchors present.
    for (const [ key, anchor ] of Object.entries(renderResult?.anchors || {})) {
      localRecord.anchors[key] = mergeAnchor(localRecord.anchors[key] || {}, anchor);
      keys.delete(key);
    }

    // If any existing anchors are no longer present in the render result, hide them.
    for (const key of [...keys]) {
      const anchor = localRecord.anchors[key];
      anchor && (anchor.visible = false);
    }

    setLocalRecord({ ...localRecord });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonStringify(renderResult)]);

  if (!adapter) { return null; }

  return <DataContextProvider adapter={adapter}>
    <link rel="stylesheet" href="https://kit.fontawesome.com/05b8235ba3.css" crossorigin="anonymous" />
    <WebsiteSDKProvider sdk={sdk} active={localRecord} />
    <Router>
      <Editor
        embedded={embedded || false}
        path={`${root || ''}/:templateType?/:templateName?/:pageId?/:collectionId?`}
        active={localRecord}
        result={renderResult}
        onChange={setLocalRecord}
        beforeDeploy={beforeDeploy}
        afterDeploy={afterDeploy}
      >
        {children}
      </Editor>
    </Router>
    <Preview
      record={localRecord}
      onChange={(result) => {
        setRenderResult(result);
      }}
    />
  </DataContextProvider>;
}

export { type IWebsiteSDK, type IWebsiteSDKMessage, DataAdapter, useWebsite } from './Data/index.js';
export * from '@neutrinodev/core';
export * from '@neutrinodev/runtime';
export * as stdlib from '@neutrinodev/stdlib';
