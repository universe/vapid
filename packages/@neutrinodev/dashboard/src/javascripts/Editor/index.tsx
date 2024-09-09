import "./Editor.css";

import { INDEX_PAGE_ID, IRecord, PageType, Record as DBRecord, sortRecords, stampRecord, Template } from '@neutrinodev/core';
import { IRenderResult } from '@neutrinodev/runtime';
import Spinner from '@universe/aether/components/Spinner';
import { ComponentChildren, Fragment } from "preact";
import { createPortal } from 'preact/compat';
import { useContext, useEffect } from "preact/hooks";
import { route } from "preact-router";
import { Toaster } from 'react-hot-toast';

import { DataContext } from "../Data/index.js";
import Menu, { scrollToEdit, scrollToNav } from './Menu.js';
import Page from './Page.js';
import * as sortable from './sortable.js';

interface RouteParts {
  active: IRecord | null;
  result: IRenderResult | null;
  embedded?: boolean;
  path?: string;
  id?: string;
  url?: string;
  templateType?: PageType | 'record';
  templateName?: string;
  pageId?: string;
  collectionId?: string;
  default?: boolean;
  children?: ComponentChildren;
  onChange: (record: IRecord | null) => void | Promise<void>;
  beforeDeploy?: () => Promise<boolean> | boolean;
  afterDeploy?: () => Promise<void> | void;
}

const drafts: Record<string, IRecord> = {};
export default function Editor(params: RouteParts) {
  const {
    children,
    embedded,
    active,
    result,

    // Hooks
    onChange,
    beforeDeploy,
    afterDeploy,
  } = params;

  let {
    // URL Props
    templateName,
    templateType,
    pageId,
    collectionId,
  } = params;

  const {
    adapter,
    theme,
    website,
    records,
    templates,
    findTemplate,
    getRecord,
    settingFor,
  } = useContext(DataContext);

  // If loading at root, route to the index page.
  useEffect(() => {
    (window.location.pathname === '/') && route(`/page/index/index`);
  }, []);

  // Make sure our sortables are sorted.
  useEffect(() => {
    if (!adapter) return;
    return sortable.init(adapter);
  }, [ adapter, templateName, templateType, pageId, collectionId, records ]);

  const recordsList = Object.values(records || {}).sort(sortRecords);
  const permalinks: Record<string, IRecord> = {};
  for (const record of recordsList) { permalinks[DBRecord.permalink(record)] = permalinks[record.id] = record; }

  // If this is an embedded record referenced by record ID, nab our correct "fully qualified" url information.
  if (templateType === 'record') {
    const record = templateName ? (permalinks[templateName] || null) : null;
    const parent = record?.parentId ? (permalinks[record.parentId || ''] || null) : null;
    const template = record ? (templates[record.templateId || ''] || null) : null;
    if (!templateName || !record || !template) { templateType = templateType = undefined; }
    else {
      templateType = template.type;
      templateName = template.name;
      pageId = parent?.slug || record?.slug;
      parent?.slug && (collectionId = record?.slug);
    }
  }

  const isNewRecord = pageId === 'new' || collectionId === 'new';
  const template = (!templateType && !templateName) ? findTemplate(PageType.PAGE, INDEX_PAGE_ID) : findTemplate(templateType, templateName);

  let draftKey = '';
  let record: IRecord | null = null;
  let parent: IRecord | null = null;

  if (template) {
    if (templateType === PageType.SETTINGS) {
      record = settingFor(template) || (drafts[Template.id(template)] = drafts[Template.id(template)] || stampRecord(template));
    }
    else if (templateType === PageType.PAGE) {
      record = getRecord(pageId, null, Template.id(template));
    }
    else if (templateType === PageType.COLLECTION) {
      record = getRecord(collectionId, pageId, Template.id(template));
      parent = getRecord(pageId, null, `${template.name}-${PageType.PAGE}`);
    }

    draftKey = Template.id(template) + (parent?.id || '');
    if (isNewRecord) {
      record = drafts[draftKey] = drafts[draftKey] || stampRecord(template, { parentId: parent?.id });
    }
  }

  // When our URL discovered record changes, inform the parent of our new working object.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onChange(structuredClone(record || parent)); }, [ onChange, record?.id, parent?.id ]);

  if (!theme || !website || !adapter) return <div class="dashboard__loading"><Spinner size="large" /></div>;
  if (!template) return <div class="dashboard__loading">404</div>;

  return <Fragment>
    <menu class={`vapid-menu vapid-menu--${embedded ? 'embedded' : 'standalone'}`} id="vapid-menu">
      {!embedded ? <Menu
        pageId={pageId || INDEX_PAGE_ID}
        templateName={templateName || null}
        templateType={templateType || null}
        result={result}
        onChange={(record) => { active && active?.id === record.id && onChange(record); }}
        onDeploy={async() => {
          const res = await beforeDeploy?.();
          if (res === false) { throw new Error('beforeDeploy hook blocked site deploy'); }
          await adapter?.deploy();
          await afterDeploy?.();
        }}
      >
        {children}
      </Menu> : null}

      <section class="vapid-editor sidebar vapid-nav" id="vapid-editor">
        <Page 
          isNewRecord={isNewRecord}
          template={template}
          record={active}
          parent={parent}
          result={result}
          onCancel={() => {
            delete drafts[draftKey];
            const prev = Object.values(records).find(r => r.id === active?.id);
            onChange(structuredClone(prev || null));
            route(`/${template.type}/${template.name}/${(parent || record)?.slug || ''}`);
          }}
          onChange={record => {
            record.slug = record.slug || INDEX_PAGE_ID;
            const slugId = permalinks[DBRecord.permalink(record)]?.id;
            if ((slugId && slugId !== record.id) || /[^A-Za-z0-9-_.~]/.test(record.slug) || record.slug === 'new') {
              record.slug = `__error__/${record.slug}`;
            }
            onChange(structuredClone(record));
          }}
          onSave={async(recordUpdates: IRecord | IRecord[], navigate?: boolean) => {
            delete drafts[draftKey];
            const update = { ...records };
            recordUpdates = Array.isArray(recordUpdates) ? recordUpdates : [recordUpdates];
            await Promise.allSettled(recordUpdates.map(async(record) => {
              if (record.deletedAt) {
                await adapter?.deleteRecord(record);
                if (navigate !== false) {
                  const parent = record.parentId ? (update[record.parentId] || null) : null;
                  const parentTemplate = parent ? (templates[parent.templateId] || null) : null;
                  const permalink = parent ? DBRecord.permalink(parent) : null;
                  if (parent && parentTemplate) {
                    route(`/${parentTemplate.type}/${parentTemplate.name}${(!permalink || permalink === '/') ? '/index' : permalink}`);
                  }
                  else {
                    route('/page/index/index');
                    scrollToNav();
                  }
                }
              }
              else {
                await adapter?.updateRecord(record);
                if (navigate !== false) {
                  onChange(structuredClone(record));
                  const permalink = DBRecord.permalink(record, parent);
                  route(`/${template.type}/${template.name}${(!permalink || permalink === '/') ? '/index' : permalink}`);
                }
              }
            }));
          }}
        />
      </section>
    </menu>

    {createPortal(<Toaster />, document.getElementById('toasts') as HTMLElement)}
  </Fragment>;
}  

export {
  scrollToEdit,
  scrollToNav,
};
