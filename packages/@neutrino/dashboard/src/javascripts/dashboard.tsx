import './dashboard.css';

import { BaseHelper, IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, Record as DBRecord, sortRecords, sortTemplatesAlphabetical, stampRecord, Template } from '@neutrino/core';
import type { IWebsite } from '@neutrino/runtime';
import Spinner from '@universe/aether/components/Spinner';
import { toTitleCase } from '@universe/util';
import { ComponentChildren,Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import Router, { route } from 'preact-router';
import { Toaster } from 'react-hot-toast';

import { DataAdapter } from './adapters/types.js';
import Editor from './Editor/index.js';
import Preview from './Preview/index.js';
import RocketButton from './RocketButton/index.js';
import * as sortable from './sortable.js';

function focusFieldPreview(evt: Event): void {
  let el: HTMLElement | null = (evt.type === 'mouseover' ? evt.target : document.activeElement) as HTMLElement || null;
  while (el) { if (el.dataset.field) { break; } el = el.parentElement as HTMLElement; }
  (document.getElementById('vapid-preview') as HTMLIFrameElement | undefined)?.contentWindow?.postMessage({ target: el?.dataset.field || null }, "*");
}

document.addEventListener('mouseover', focusFieldPreview);
document.addEventListener('mouseout', focusFieldPreview);
document.addEventListener('focusin', focusFieldPreview);
document.addEventListener('focusout', focusFieldPreview);

function scrollToEdit() {
  const $MAIN = document.getElementById('vapid-menu') as HTMLElement;
  $MAIN.scrollTo({ left: $MAIN.scrollWidth, behavior: 'smooth' });
}

function scrollToNav() {
  const $MAIN = document.getElementById('vapid-menu') as HTMLElement;
  $MAIN.scrollTo({ left: 0, behavior: 'smooth' });
}

const NAV_ICONS = {
  [PageType.PAGE]: '/images/page.svg',
  [PageType.COLLECTION]: '/images/collection.svg',
  [PageType.SETTINGS]: '/images/settings.svg',
};

function navLink(page: IRecord | null = null, template: ITemplate | null = null, collection: ITemplate | null, activeId = '') {
  if (!template || page?.deletedAt) { return null; }
  if (template.type === PageType.SETTINGS) {
    return <a href={`/${template.type}/${template.name}`} data-id={page?.id} class={`${(Template.id(template) === activeId) ? 'active' : ''} item`} onClick={scrollToEdit}>
      <img src={NAV_ICONS[template.type]} />
      {toTitleCase(template.name)}
    </a>;
  }
  if (!page) { return null; }
  return <a href={`/${template.type}/${template.name}/${page.slug}`} data-id={page.id} class={`${(page.slug === activeId) ? 'active' : ''} item`} onClick={scrollToEdit}>
    <img src={NAV_ICONS[collection ? PageType.COLLECTION : template.type]} />
    {DBRecord.getName(page, template)}
  </a>;
}

interface RouteParts {
  path?: string;
  id?: string;
  url?: string;
  templateType?: PageType;
  templateName?: string;
  pageId?: string;
  collectionId?: string;
  default?: boolean;
  adapter?: DataAdapter | null;
  children?: ComponentChildren;
}

function getTemplate(type: PageType | null = null, name: string | null = '', templates: ITemplate[] = []) {
  if (!name || !type) { return null; }
  for (const template of templates) {
    if (template.type === type && template.name === name) { return template; }
  }
  return null;
}

function settingFor(template: ITemplate, records: IRecord[] = []) {
  const id = Template.id(template);
  if (!id) { return null; }
  for (const record of records) {
    console.log(id, record.templateId, record);
    if (record.templateId === id) { return record; }
  }
  return null;
}

function getRecordById(records: IRecord[] = [], id: string | null = null) {
  if (!id) { return null; }
  for (const record of records) {
    if (record.id === id) { return record; }
  }
  return null;
}

function getRecord(records: IRecord[] = [], templateId: string, slug: string | null = null, parentSlug: string | null = null) {
  if (!slug) { return null; }
  for (const record of records) {
    if (
      record.slug === slug &&
      record.templateId === templateId &&
      ((!parentSlug && (!record.parentId || record.parentId === NAVIGATION_GROUP_ID)) || getRecordById(records, record.parentId)?.slug === parentSlug)
    ) { return record; }
  }
  return null;
}

function templateFor(record: IRecord | null, templates: ITemplate[]): ITemplate | null {
  if (!record) { return null; }
  for (const template of templates) {
    if (record.templateId === Template.id(template)) { return template; }
  }
  return null;
}

function collectionFor(template: ITemplate | null, templates: ITemplate[]): ITemplate | null {
  if (!template) { return null; }
  for (const other of templates) {
    if (template.name === other.name && other.type === PageType.COLLECTION) { return template; }
  }
  return null;
}

const drafts: Record<string, IRecord> = {};
function Content(params: RouteParts) {
  const { adapter, children, templateName, templateType, pageId, collectionId } = params;
  const [ pageTemplatesOpen, setPageTemplatesOpen ] = useState(false);
  const [ previewLayout, setPreviewLayout ] = useState<'full' | 'desktop' | 'mobile'>('desktop');
  const [ localRecord, setLocalRecord ] = useState<IRecord | null>(null);
  const [ isLocalTheme, setLocalTheme ] = useState<boolean>(false);
  const [ siteData, setSiteData ] = useState<IWebsite | null>(null);
  const [ records, setRecords ] = useState<Record<string, IRecord>>({});

  // If loading at root, route to the index page.
  useEffect(() => { window.location.pathname === '/' && route(`/page/index/index`); }, [window.location.pathname]);

  // Start watching our web socket in dev mode.
  useEffect(() => {
    if (!adapter) { return; }
    if ('WebSocket' in window) {
      try {
        // const ws = new WebSocket(`ws${location.protocol === 'https:' ? 's' : ''}://${(location.host || 'localhost').split(':')[0]}:35729/livereload`);
        const ws = new WebSocket(`ws://localhost:35729/livereload`);
        setLocalTheme(true);
        ws.onmessage = async(evt) => {
          const { command, data } = JSON.parse(evt.data) as { command: string; data: IWebsite; };
          console.log(`[WebSocket ${command}]`, data);
          switch (command) {
            case 'update': setSiteData({ ...(await adapter.getTheme()), hbs: data.hbs });
          }
        };
      }
      catch { 1; }
    }
  }, [adapter]);

  // Make sure our sortables are sortable.
  useEffect(() => {
    if (!adapter || !siteData) return;
    return sortable.init(adapter, ({ id, to, parentId }) => {
      const record = records[id];
      record.parentId = parentId;
      record.order = to;
      setSiteData({ ...siteData });
    });
  }, [ templateName, templateType, pageId, collectionId, siteData, records ]);

  // Once we have an adapter initialized, fetch our site data.
  useEffect(() => {
    (async() => {
      if (!adapter) { return; }
      BaseHelper.registerFileHandler(adapter.saveFile.bind(adapter));
      setSiteData(await adapter.getTheme());
      setRecords(await adapter.getAllRecords());
    })();
  }, [adapter]);

  const recordsList = Object.values(records || {}).sort(sortRecords);
  const permalinks: Record<string, string> = {};
  for (const record of recordsList) { permalinks[DBRecord.permalink(record)] = record.id; }

  const isNewRecord = pageId === 'new' || collectionId === 'new';
  const templates = Object.values(siteData?.hbs?.templates || {});
  const template = (!templateType && !templateName) ? getTemplate(PageType.PAGE, 'index', templates) : getTemplate(templateType, templateName, templates);

  let record: IRecord | null = null;
  let parent: IRecord | null = null;
  let draftKey = '';

  if (template) {
    if (templateType === PageType.SETTINGS) {
      record = settingFor(template, recordsList) || (drafts[Template.id(template)] = drafts[Template.id(template)] || stampRecord(template));
    }
    else if (templateType === PageType.PAGE) { record = getRecord(recordsList, Template.id(template), pageId); }
    else if (templateType === PageType.COLLECTION) {
      record = getRecord(recordsList, Template.id(template), collectionId, pageId);
      parent = getRecord(recordsList, `${template.name}-${PageType.PAGE}`, pageId);
    }
  
    draftKey = Template.id(template) + (parent?.id || '');
    if (isNewRecord) {
      record = drafts[draftKey] = drafts[draftKey] || stampRecord(template, { parentId: parent?.id });
    }
  }

  useEffect(() => { setLocalRecord(JSON.parse(JSON.stringify(record))); }, [record?.id]);

  if (!siteData) return <div class="dashboard__loading"><Spinner size="large" /></div>;
  if (!template) return <div class="dashboard__loading">404</div>;

  document.getElementById('preview-device')?.classList.toggle('device-iphone-x', previewLayout === 'mobile');
  document.getElementById('preview-container')?.classList.toggle('preview-container--full-screen', previewLayout === 'full');

  return <Fragment>
    <menu class="vapid-menu" id="vapid-menu">
      <section class="sidebar vapid-nav">
        <header class="vapid-nav__outlet">
          {children || <h2 class="heading">{siteData.meta.name}</h2>}
        </header>

        <nav class="vapid-nav">
          <div class="item">
            {isLocalTheme ? <button id="add-page" class="sidebar__add-page" onClick={() => { adapter?.deployTheme('neutrino', 'latest'); }}>
              Save Template
            </button> : null}
            <button id="add-page" class="sidebar__add-page" onClick={() => { setPageTemplatesOpen(true); }}>
              Add a Page
            </button>
            <div class="menu sortable">
              {recordsList.map((page) => page.parentId === NAVIGATION_GROUP_ID 
                ? navLink(
                    page, 
                    templateFor(page, templates), 
                    collectionFor(templateFor(page, templates), templates), 
                    params.pageId,
                  ) 
                : null,
              )}
              <hr class="sidebar__divider" />
              {recordsList.map((page) => {
                if (page.parentId) { return null; }
                const tmpl = templateFor(page, templates);
                const collection = collectionFor(tmpl, templates);
                if (!tmpl || tmpl?.type !== PageType.PAGE) { return null; }
                return navLink(page, tmpl, collection, params.pageId);
              })}
            </div>
          </div>

            <div class="item">
              <div class="header">Settings</div>
              <div class="menu">
                {templates.sort(sortTemplatesAlphabetical).map((tmpl) => {
                  if (tmpl?.type !== PageType.SETTINGS) { return null; }
                  if (!Object.keys(tmpl?.fields).length) { return null; }
                  return navLink(null, tmpl, null, `${params.templateName}-${params.templateType}`);
                })}
              </div>
            </div>
        </nav>

        <section class="vapid-nav__controls">
          <RocketButton onClick={(reset: () => void) => {
            adapter?.deploy(siteData, records);
            setTimeout(() => reset(), 6000);
          }} />
        </section>
      </section>

      <section class="vapid-editor sidebar vapid-nav" id="vapid-editor">
        <Editor adapter={adapter || null} isNewRecord={isNewRecord} template={template} record={localRecord} parent={parent} records={records} siteData={siteData}
          onCancel={() => {
            delete drafts[draftKey];
            setLocalRecord(JSON.parse(JSON.stringify(record)));
            route(`/${template.type}/${template.name}/${(parent || record)?.slug || ''}`);
          }}
          onChange={record => {
            record.slug = record.slug || 'index';
            const slugId = permalinks[DBRecord.permalink(record)];
            if ((slugId && slugId !== record.id) || /[^A-Za-z0-9-_.~]/.test(record.slug) || record.slug === 'new') {
              record.slug = `__error__/${record.slug}`;
            }
            setLocalRecord(JSON.parse(JSON.stringify(record)));
          }}
          onSave={(recordUpdates: IRecord | IRecord[], navigate?: boolean) => {
            delete drafts[draftKey];
            recordUpdates = Array.isArray(recordUpdates) ? recordUpdates : [recordUpdates];
            for (const record of recordUpdates) {
              records[record.id] = record;
              if (record.deletedAt) {
                const parent = record.parentId ? (records[record.parentId] || null) : null;
                const parentTemplate = parent ? (siteData.hbs.templates[parent.templateId] || null) : null;
                const permalink = parent ? DBRecord.permalink(parent) : null;
                if (parent && parentTemplate) {
                  route(`/${parentTemplate.type}/${parentTemplate.name}${(!permalink || permalink === '/') ? '/index' : permalink}`);
                }
                else {
                  route('/page/index/index');
                  scrollToNav();
                }
              }
              else if (navigate !== false) {
                setLocalRecord(JSON.parse(JSON.stringify(record)));
                const permalink = DBRecord.permalink(record, parent);
                route(`/${template.type}/${template.name}${(!permalink || permalink === '/') ? '/index' : permalink}`);
              }
            }
            setSiteData({ ...siteData });
            setRecords({ ...records });
          }}
        />
      </section>
    </menu>

    <Preview siteData={siteData} record={localRecord || parent} records={JSON.parse(JSON.stringify(records))} />

    {createPortal(
      <dialog class="section page-templates" id="page-templates" open={pageTemplatesOpen}>
        <h2 class="page-templates__header">Select a Page Template</h2>
        <button class="page-templates__close" onClick={() => setPageTemplatesOpen(false)}>Cancel</button>
        <ul class="page-templates__list">
          {templates.map((template) => {
            if (template.type !== PageType.PAGE || !siteData.hbs.templates[Template.id(template)]) { return null; }
            return <li key={template.name} class="page-templates__template">
              <a href={`/page/${template.name}/new`} onClick={() => { setPageTemplatesOpen(false); scrollToEdit(); }}>{toTitleCase(template.name)}</a>
            </li>;
          })}
        </ul>
      </dialog>,
      document.getElementById('modals') as HTMLElement,
    )}

    {createPortal(<Toaster />, document.getElementById('toasts') as HTMLElement)}

    {/* eslint-disable max-len */}
    {createPortal(
      <nav class={`preview-controls preview-controls--${previewLayout}`}>
        <ul class="preview-controls__list">
          <li><button class="preview-controls__button preview-controls__button--full-screen" onClick={() => setPreviewLayout('full')}>Full Screen</button></li>
          <li><button onClick={() => setPreviewLayout('mobile')} class={`preview-controls__button preview-controls__button--mobile ${previewLayout === 'mobile' ? 'preview-controls__button--active' : ''}`}>Mobile</button></li>
          <li><button onClick={() => setPreviewLayout('desktop')} class={`preview-controls__button preview-controls__button--desktop ${previewLayout == 'desktop' ? 'preview-controls__button--active' : ''}`}>Desktop</button></li>
          <li><a href={`https://${siteData?.meta?.domain}`} target="_blank" class="preview-controls__button preview-controls__button--breakout" rel="noreferrer">Breakout</a></li>
        </ul>
        <button class="preview-controls__exit preview-controls__button" onClick={() => setPreviewLayout('desktop')}>Exit</button>
      </nav>,
      /* eslint-enable max-len */
      document.getElementById('menu') as HTMLElement,
    )}
  </Fragment>;
}

export function Dashboard({ adapter, children, root }: { adapter: DataAdapter | null; children?: ComponentChildren; root: string; }) {
  if (!adapter) { return null; }
  return <>
    <Router>
      <Content path={`${root || ''}/:templateType?/:templateName?/:pageId?/:collectionId?`} adapter={adapter}>{children}</Content>
    </Router>
    <article class="vapid-preview" id="preview-container">
      <div id="preview-device" class="device">
        <div class="device-frame">
          <iframe src="about:blank" id="vapid-preview" class="vapid-preview__iframe" sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms" />
        </div>
        <div class="device-stripe" />
        <div class="device-header" />
        <div class="device-sensors" />
        <div class="device-btns" />
        <div class="device-power" />
      </div>
      <iframe src="about:blank" id="vapid-preview-scratch" class="vapid-preview__scratch-iframe" sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms" />
    </article>
  </>;
}

