import './dashboard.css';

import { toTitleCase } from '@universe/util';
import { render as renderPreact, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import Router, { route } from 'preact-router';
import { unescape } from 'html-escaper';
import { Toaster } from 'react-hot-toast';

import * as sortable from './sortable';
import type { ISiteData } from '../index';
import { Template, ITemplate, IRecord, PageType, sortRecords, sortTemplates, stampRecord, Record as DBRecord } from '../../../Database/models/index';

import RocketButton from './RocketButton';
import Editor from './Editor';
import Preview from './Preview';

const PREVIEW_FRAME = document.getElementById('vapid-preview') as HTMLIFrameElement;
function focusFieldPreview(evt: Event): void {
  let el: HTMLElement | null = (evt.type === 'mouseover' ? evt.target : document.activeElement) as HTMLElement || null
  while (el) { if (el.dataset.field) { break; } el = el.parentElement as HTMLElement; }
  PREVIEW_FRAME.contentWindow?.postMessage({ target: el?.dataset.field || null }, "*");
}

document.addEventListener('mouseover', focusFieldPreview);
document.addEventListener('mouseout', focusFieldPreview);
document.addEventListener('focusin', focusFieldPreview);
document.addEventListener('focusout', focusFieldPreview);

function scrollToEdit() {
  const $MAIN = document.getElementById('main') as HTMLElement;
  $MAIN.scrollTo({ left: $MAIN.scrollWidth, behavior: 'smooth' })
}

const NAV_ICONS = {
  [PageType.PAGE]: '/dashboard/static/images/page.svg',
  [PageType.COLLECTION]: '/dashboard/static/images/collection.svg',
  [PageType.SETTINGS]: '/dashboard/static/images/settings.svg',
}

function navLink(page: IRecord | null = null, template: ITemplate | null = null, collection: ITemplate | null, activeId: string = '') {
  if (!template) { return null; }
  if (template.type === PageType.SETTINGS) {
    return <a href={`/${template.type}/${template.name}`} data-id={page?.id} class={`${(Template.id(template) === activeId) ? 'active' : ''} item`} onClick={scrollToEdit}>
      <img src={NAV_ICONS[template.type]} />
      {toTitleCase(template.name)}
    </a>
  }
  if (!page) { return null; }
  return <a href={`/${template.type}/${template.name}/${page.slug}`} data-id={page.id} class={`${(page.slug === activeId) ? 'active' : ''} item`} onClick={scrollToEdit}>
    <img src={NAV_ICONS[collection ? PageType.COLLECTION : template.type]} />
    {toTitleCase(page.name || 'Home')}
  </a>
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
      ((!parentSlug && (!record.parentId || record.parentId === 'navigation')) || getRecordById(records, record.parentId)?.slug === parentSlug)
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
function App(params: RouteParts) {
  const { templateName, templateType, pageId, collectionId } = params;
  const [ pageTemplatesOpen, setPageTemplatesOpen ] = useState(false);
  const [ previewLayout, setPreviewLayout ] = useState<'full' | 'desktop' | 'mobile'>('desktop');
  const [ localRecord, setLocalRecord ] = useState<IRecord | null>(null);
  const [ siteData, setSiteData ] = useState<ISiteData>(JSON.parse(unescape(document.getElementById('site-data')?.innerHTML as string)) as ISiteData)
  const records = Object.values(siteData.records).sort(sortRecords);
  const permalinks: Record<string, string> = {};
  for (const record of records) {
    permalinks[DBRecord.permalink(record)] = record.id;
  }

  const isNewRecord = pageId === 'new' || collectionId === 'new';
  const templates = Object.values(siteData.hbs.templates);

  const template = (!templateType && !templateName) ? getTemplate(PageType.PAGE, 'index', templates) : getTemplate(templateType, templateName, templates);

  if (!template) return <div>404</div>;

  let record: IRecord | null = null;
  let parent: IRecord | null = null;

  if (templateType === PageType.SETTINGS) {
    record = settingFor(template, records) || (drafts[Template.id(template)] = drafts[Template.id(template)] || stampRecord(template));
  }
  else if (templateType === PageType.PAGE) { record = getRecord(records, Template.id(template), pageId); }
  else if (templateType === PageType.COLLECTION) {
    record = getRecord(records, Template.id(template), collectionId, pageId);
    parent = getRecord(records, `${template.name}-${PageType.PAGE}`, pageId);
  }

  if (isNewRecord && template) {
    const draftKey = Template.id(template) + (parent?.id || '');
    record = drafts[draftKey] = drafts[draftKey] || stampRecord(template, { parentId: parent?.id });
  }

  console.log('APP RENDER', params, siteData, template, record, parent);

  document.getElementById('preview-device')?.classList.toggle('device-iphone-x', previewLayout === 'mobile');
  document.getElementById('preview-container')?.classList.toggle('preview-container--full-screen', previewLayout === 'full');

  useEffect(() => {
    if ('WebSocket' in window) {
      const ws = new WebSocket(`ws${location.protocol === 'https:' ? 's' : ''}://${(location.host || 'localhost').split(':')[0]}:35729/livereload`);
      ws.onmessage = (evt) => {
        const { command, data } = JSON.parse(evt.data);
        console.log(command, data);
        switch (command) {
          case 'update': setSiteData(data as ISiteData);
        }
      };
    }
  }, []);

  useEffect(() => sortable.init(), [ templateName, templateType, pageId, collectionId ]);
  useEffect(() => setLocalRecord(JSON.parse(JSON.stringify(record))), [ record ]);

  return <Fragment>
    <section class="sidebar vapid-nav">
      <header class="vapid-nav__heading">
        <h2 class="heading">{siteData.site.name}</h2>
        <button id="add-page" class="sidebar__add-page" onClick={() => { setPageTemplatesOpen(true); }}>Add a Page</button>
      </header>

      <nav class="vapid-nav">
        <div class="item">
          <div class="menu sortable">
            {records.map((page) => page.parentId === 'navigation' ? navLink(page, templateFor(page, templates), collectionFor(templateFor(page, templates), templates), params.pageId) : null)}
            <hr class="sidebar__divider" />
            {records.map((page) => {
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
              {templates.sort(sortTemplates).map((tmpl) => {
                if (tmpl?.type !== PageType.SETTINGS) { return null; }
                return navLink(null, tmpl, null, `${params.templateName}-${params.templateType}`);
              })}
            </div>
          </div>
      </nav>

      <section class="vapid-nav__controls">
        <RocketButton onClick={() => {
          setTimeout(() => window.open('/dashboard/deploy'), 3200);
        }} />
      </section>
    </section>

    <section class="vapid-editor sidebar vapid-nav" id="vapid-editor">
      <Editor isNewRecord={isNewRecord} template={template} record={localRecord} parent={parent} siteData={siteData} onChange={record => {
        const slugId = permalinks[DBRecord.permalink(record)];
        if ((slugId && slugId !== record.id) || record.slug === 'new') { record.slug = `__error__/${record.slug}`; }
        setLocalRecord(JSON.parse(JSON.stringify(record)));
      }} onSave={record => {
        siteData.records[record.id] = record;
        setSiteData({ ...siteData });
        setLocalRecord(JSON.parse(JSON.stringify(record)));
        route(`/${template.type}/${template.name}${DBRecord.permalink(record)}`);
      }} />
    </section>

    <Preview siteData={siteData} record={localRecord} />

    {createPortal(
      <dialog class="section page-templates" id="page-templates" open={pageTemplatesOpen}>
        <h2 class="page-templates__header">Select a Page Template</h2>
        <button class="page-templates__close" onClick={() => setPageTemplatesOpen(false)}>Cancel</button>
        <ul class="page-templates__list">
          {templates.map((template) => {
            if (template.type !== PageType.PAGE) { return null; }
            return <li class="page-templates__template">
              <a href={`/page/${template.name}/new`} onClick={() => setPageTemplatesOpen(false)}>{toTitleCase(template.name)}</a>
            </li>
          })}
        </ul>
      </dialog>,
      document.getElementById('modals') as HTMLElement,
    )}

    {createPortal(<Toaster />, document.getElementById('toasts') as HTMLElement)}

    {createPortal(
      <nav class={`preview-controls preview-controls--${previewLayout}`}>
        <ul class="preview-controls__list">
          <li><button class="preview-controls__button preview-controls__button--full-screen" onClick={() => setPreviewLayout('full')}>Full Screen</button></li>
          <li><button onClick={() => setPreviewLayout('mobile')} class={`preview-controls__button preview-controls__button--mobile ${previewLayout === 'mobile' ? 'preview-controls__button--active' : ''}`}>Mobile</button></li>
          <li><button onClick={() => setPreviewLayout('desktop')} class={`preview-controls__button preview-controls__button--desktop ${previewLayout == 'desktop' ? 'preview-controls__button--active' : ''}`}>Desktop</button></li>
          <li><a href={window.location.href} target="_blank" class="preview-controls__button preview-controls__button--breakout">Breakout</a></li>
        </ul>
        <button class="preview-controls__exit preview-controls__button" onClick={() => setPreviewLayout('desktop')}>Exit</button>
      </nav>,
      document.getElementById('menu') as HTMLElement,
    )}
  </Fragment>
}

function Root() {
  return <Router>
    <App path="/:templateType?/:templateName?/:pageId?/:collectionId?" />
  </Router>
}

renderPreact(<Root />, document.getElementById('main')!);
