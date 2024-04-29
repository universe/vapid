import {
  INDEX_PAGE_ID,
  IRecord,
  ITemplate,
  NAVIGATION_GROUP_ID,
  PageType,
  Record as DBRecord,
  sortRecords,
  sortTemplatesAlphabetical,
  stampRecord,
  Template,
} from "@neutrinodev/core";
import { IWebsite,  renderRecord, update } from "@neutrinodev/runtime";
import type { SimpleDocument, SimpleNode } from '@simple-dom/interface';
import { toTitleCase } from "@universe/util";
import { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useState } from "preact/hooks";

import CollectionImage from '../../images/collection.svg';
import PageImage from '../../images/page.svg';
import SettingsImage from '../../images/settings.svg';
import { DataAdapter } from "../adapters/types.js";
import RocketButton from '../RocketButton/index.js';
import { collectionFor, scrollToEdit,templateFor } from '../utils.js';

const NAV_ICONS = {
  [PageType.PAGE]: PageImage,
  [PageType.COLLECTION]: CollectionImage,
  [PageType.SETTINGS]: SettingsImage,
  [PageType.COMPONENT]: '', // Shouldn't ever happen.
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

export interface IMenuProps {
  children: ComponentChildren;
  isLocal: boolean;
  theme: IWebsite;
  adapter: DataAdapter;
  templates: ITemplate[];
  records: Record<string, IRecord>;
  pageId: string;
  templateName: string | null;
  templateType: string | null;
  beforeDeploy?: () => Promise<boolean> | boolean;
  afterDeploy?: () => Promise<void> | void;
}

export default function Menu({
  children,
  beforeDeploy,
  afterDeploy,
  isLocal,
  theme,
  adapter,
  templates,
  records,
  pageId,
  templateName,
  templateType,
}: IMenuProps) {
  const [ pageTemplatesOpen, setPageTemplatesOpen ] = useState(false);

  const recordsList = Object.values(records || {}).sort(sortRecords);

  useEffect(() => {
    (async() => {
      for (const template of templates) {
        // If is a component, settings page, or collection with a renderable base page, skip.
        if (
          template.type === PageType.COMPONENT || 
          template.type === PageType.SETTINGS || 
          (template.type === PageType.COLLECTION && theme.hbs.pages[`${template.name}-page`])
        ) { continue; }
        // Grab our preview iframe documents.
        const doc = (document.getElementById(`template-${template.name}-preview`) as HTMLIFrameElement).contentDocument;
        if (!doc) { return; }
  
        // Render the site into our hidden scratch document.
        /* eslint-disable-next-line */
        const fragment = await renderRecord(false, doc as unknown as SimpleDocument, stampRecord(template), theme, records) as unknown as DocumentFragment;
        if (fragment) {
          update(fragment.children[0] as unknown as SimpleNode, doc.children[0] as unknown as SimpleNode);
          doc.children[0].querySelector('body')?.setAttribute('neutrino-preview', 'true');
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  useEffect(() => {
    (document.getElementById(`vapid-preview-scratch`) as HTMLIFrameElement)?.classList?.toggle('visible', pageTemplatesOpen);
  }, [pageTemplatesOpen]);

  return <section class="sidebar vapid-nav">
    <header class="vapid-outlet">
      {children || <h2 class="heading">{theme.meta.name}</h2>}
    </header>
    <nav class="vapid-nav">
      <div class="item">
        {isLocal ? <button id="add-page" class="sidebar__add-page" onClick={() => { adapter?.deployTheme('neutrino', 'latest'); }}>
          Save Template
        </button> : null}
        <button id="add-page" class="sidebar__add-page" onClick={() => { setPageTemplatesOpen(true); }}>
          + Add a Page
        </button>
        <div class="menu sortable">
          {recordsList.map((page) => page.parentId === NAVIGATION_GROUP_ID
            ? navLink(
              page,
              templateFor(page, templates),
              collectionFor(templateFor(page, templates), templates),
              pageId,
            )
            : null,
          )}
          <hr class="sidebar__divider" />
          {recordsList.map((page) => {
            if (page.parentId) { return null; }
            const tmpl = templateFor(page, templates);
            const collection = collectionFor(tmpl, templates);
            if (!tmpl || tmpl?.type !== PageType.PAGE) { return null; }
            return navLink(page, tmpl, collection, pageId);
          })}
        </div>
      </div>

      <div class="item">
        <div class="header">Settings</div>
        <div class="menu">
          {templates.sort(sortTemplatesAlphabetical).map((tmpl) => {
            if (tmpl?.type !== PageType.SETTINGS) { return null; }
            if (!Object.keys(tmpl?.fields).length) { return null; }
            return navLink(null, tmpl, null, `${templateName}-${templateType}`);
          })}
        </div>
      </div>
    </nav>

    <section class="vapid-nav__controls">
      <RocketButton
        onClick={async (reset: () => void) => {
          const res = await beforeDeploy?.();
          if (!res) { reset(); return; }
          await adapter?.deploy(theme, records);
          afterDeploy?.();
          setTimeout(() => reset(), 6000);
        }}
      />
    </section>
    {createPortal(
      <dialog class="section page-templates" id="page-templates" open={pageTemplatesOpen}>
        <h2 class="page-templates__header">Select a Page Template</h2>
        <button class="page-templates__close" onClick={() => setPageTemplatesOpen(false)}>Cancel</button>
        <ul class="page-templates__list">
          {templates.sort((a, b) => {
            if (a.name === INDEX_PAGE_ID) return -1;
            if (b.name === INDEX_PAGE_ID) return 1;
            return a.name > b.name ? 1 : -1;
          }).map((template) => {
            if (template.type !== PageType.PAGE) { return null; }
            return <li key={template.name} class={`page-templates__template page-templates__template--${template.name}`}>
              <a
                href={`/page/${template.name}/new`}
                onClick={() => { setPageTemplatesOpen(false); scrollToEdit(); }}
                onMouseLeave={() => {
                  const el = (document.getElementById(`vapid-preview-scratch`) as HTMLIFrameElement);
                  const doc = el?.contentDocument;
                  if (!doc) { return; }
                  el.classList.remove('over');
                  // eslint-disable-next-line max-len
                  doc.children[0].querySelector('body')?.setAttribute('style', 'opacity: 0; background: transparent; overflow: hidden; transition: opacity .18s ease-in-out, background .18s ease-in-out;');
                }}
                onMouseOver={async() => {
                  // If is a component, settings page, or collection with a renderable base page, skip.
                  // Grab our preview iframe documents.
                  const el = (document.getElementById(`vapid-preview-scratch`) as HTMLIFrameElement);
                  const doc = el?.contentDocument;
                  if (!doc) { return; }
                  el.classList.add('over');

                  let tmpl: ITemplate | null = template;
                  if (template.type === PageType.PAGE && !theme.hbs.pages[`${template.name}-page`] && theme.hbs.pages[`${template.name}-collection`]) {
                    tmpl = templates.find(t => (t.name === template.name && t.type === PageType.COLLECTION)) || null;
                  }

                  if (!tmpl) {
                    // eslint-disable-next-line max-len
                    doc.children[0].querySelector('body')?.setAttribute('style', 'opacity: 0; background: transparent; overflow: hidden; transition: opacity .18s ease-in-out, background .18s ease-in-out;');
                    el.classList.remove('over');
                    return;
                  }

                  // Render the site into our hidden scratch document.
                  /* eslint-disable-next-line */
                  const fragment = await renderRecord(false, doc as unknown as SimpleDocument, stampRecord(tmpl), theme, records) as unknown as DocumentFragment;
                  if (!el.classList.contains('over')) { return; }
                  if (fragment) {
                    // eslint-disable-next-line max-len
                    doc.children[0].querySelector('body')?.setAttribute('style', 'opacity: 0; background: transparent; overflow: hidden; transition: opacity .18s ease-in-out, background .18s ease-in-out;');
                    await new Promise(r => setTimeout(r, 180));
                    if (!el.classList.contains('over')) { return; }
                    update(fragment.children[0] as unknown as SimpleNode, doc.children[0] as unknown as SimpleNode);
                    doc.children[0].querySelector('body')?.setAttribute('neutrino-preview', 'true');
                    // eslint-disable-next-line max-len
                    doc.children[0].querySelector('body')?.setAttribute('style', 'opacity: 1; background: white; overflow: hidden; transition: opacity .18s ease-in-out, background .18s ease-in-out;');
                  }
                }}
              >
                <iframe class="page-templates__preview" id={`template-${template.name}-preview`} />
                {template.name === INDEX_PAGE_ID ? 'Home Page' : toTitleCase(template.name)}
              </a>
            </li>;
          })}
        </ul>
      </dialog>,
      document.getElementById('modals') as HTMLElement,
    )}
  </section>;
}