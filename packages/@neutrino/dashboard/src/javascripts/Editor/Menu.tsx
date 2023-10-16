import { INDEX_PAGE_ID,IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, Record as DBRecord, sortRecords, sortTemplatesAlphabetical, Template } from "@neutrino/core";
import { IWebsite } from "@neutrino/runtime";
import { toTitleCase } from "@universe/util";
import { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useState } from "preact/hooks";

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
          Add a Page
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
            if (template.name === 'collection' || template.type !== PageType.PAGE || !theme.hbs.templates[Template.id(template)]) { return null; }
            return <li key={template.name} class="page-templates__template">
              <a
                href={`/page/${template.name}/new`}
                onClick={() => { setPageTemplatesOpen(false); scrollToEdit(); }}
              >
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