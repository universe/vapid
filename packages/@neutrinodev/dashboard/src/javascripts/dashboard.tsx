import '@neutrinodev/stdlib/style.css';
import '../stylesheets/dashboard.css';
import './dashboard.css';

import { IRecord } from '@neutrinodev/core';
import { ComponentChildren } from 'preact';
import { useEffect, useId, useState } from 'preact/hooks';
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

interface IMatrixProps{
  width: number;
  height: number;
  size: number;
  padding: number;
}

function Matrix({ width, height, size, padding }: IMatrixProps) {
  const canvasId = useId();
  size = size || 14;
  padding = padding || 4;

  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }
    
    const w = width || window.innerWidth;
    const h = height || window.innerHeight;
    const cols = Math.floor(w / (size + padding)) + 1;
    const ypos = Array(cols).fill(0);
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    function matrix () {
      if (!ctx) { return; }
      ctx.fillStyle = '#0001';
      ctx.fillRect(0, 0, w, h);
      
      ctx.fillStyle = '#0f0';
      ctx.font = `${size}px monospace`;
      
      ypos.forEach((y, ind) => {
        const text = String.fromCharCode(Math.random() * 128);
        const x = ind * (size + padding);
        ctx.fillText(text, x, y);
        if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
        else ypos[ind] = y + (size + padding);
      });
    }
    
    const interval = setInterval(matrix, 50);

    return () => clearInterval(interval);
  }, [ canvasId, width, height, size, padding ]);

  return <canvas class="matrix-background" id={canvasId} width={width} height={height} />;
}

interface IThemeDeployButtonProps {
  adapter: DataAdapter | null;
}

function ThemeDeployButton({ adapter }: IThemeDeployButtonProps) {
  const [ loadingState, setLoadingState ] = useState<'loading' | 'error' | 'success' | 'waiting'>('waiting');

  return <button class={`sidebar__deploy-theme sidebar__deploy-theme--${loadingState}`} onClick={async() => {
    if (loadingState !== 'waiting') { return; }
    setLoadingState('loading');
    const start = Date.now();
    try {
      await adapter?.deployTheme('neutrino', 'latest');
      await new Promise(r => setTimeout(r, 3000 - (Date.now() - start)));
      setLoadingState('success');
    }
    catch {
      await new Promise(r => setTimeout(r, 3000 - (Date.now() - start)));
      setLoadingState('error');
    }

    setTimeout(() => setLoadingState('waiting'), 3000);
  }}>
    Deploy Template
    <Matrix width={162} height={48} size={11} padding={2} />
  </button>;
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
    <ThemeDeployButton adapter={adapter} />
  </DataContextProvider>;
}

export { type IWebsiteSDK, type IWebsiteSDKMessage, DataAdapter, useWebsite } from './Data/index.js';
export * from '@neutrinodev/core';
export * from '@neutrinodev/runtime';
export * as stdlib from '@neutrinodev/stdlib';
