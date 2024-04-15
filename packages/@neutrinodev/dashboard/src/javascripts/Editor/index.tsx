import { INDEX_PAGE_ID, IRecord, PageType, Record as DBRecord, sortRecords, stampRecord, Template } from '@neutrinodev/core';
import Spinner from '@universe/aether/components/Spinner';
import { ComponentChildren, Fragment } from "preact";
import { createPortal } from 'preact/compat';
import { useContext, useEffect } from "preact/hooks";
import { route } from "preact-router";
import { Toaster } from 'react-hot-toast';

import * as sortable from '../sortable.js';
import { WebsiteContext } from "../theme.js";
import { getRecord, getTemplate, scrollToNav,settingFor } from '../utils.js';
import Menu from './Menu.js';
import Page from './Page.js';

interface RouteParts {
  active: IRecord | null;
  embedded?: boolean;
  path?: string;
  id?: string;
  url?: string;
  templateType?: PageType;
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

    // URL Props
    templateName,
    templateType,
    pageId,
    collectionId,

    // Hooks
    onChange,
    beforeDeploy,
    afterDeploy,
  } = params;

  const { adapter, theme, records, isLocal, setTheme, setRecords } = useContext(WebsiteContext);

  // If loading at root, route to the index page.
  useEffect(() => {
    (window.location.pathname === '/') && route(`/page/index/index`);
  }, []);

  // Make sure our sortables are sorted.
  useEffect(() => {
    if (!adapter || !theme) return;
    return sortable.init(adapter, ({ id, to, parentId }) => {
      const record = records[id];
      record.parentId = parentId;
      record.order = to;
      setTheme({ ...theme });
    });
  }, [ templateName, templateType, pageId, collectionId, theme, records ]);

  const recordsList = Object.values(records || {}).sort(sortRecords);
  const permalinks: Record<string, string> = {};
  for (const record of recordsList) { permalinks[DBRecord.permalink(record)] = record.id; }

  const isNewRecord = pageId === 'new' || collectionId === 'new';
  const templates = Object.values(theme?.hbs?.templates || {});
  const template = (!templateType && !templateName) ? getTemplate(PageType.PAGE, INDEX_PAGE_ID, templates) : getTemplate(templateType, templateName, templates);

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

  useEffect(() => { onChange(JSON.parse(JSON.stringify(record || parent))); }, [ record?.id, parent?.id ]);

  if (!theme || !adapter) return <div class="dashboard__loading"><Spinner size="large" /></div>;
  if (!template) return <div class="dashboard__loading">404</div>;

  return <Fragment>
    <link rel="stylesheet" href="https://kit.fontawesome.com/05b8235ba3.css" crossorigin="anonymous" />
    <menu class={`vapid-menu vapid-menu--${embedded ? 'embedded' : 'standalone'}`} id="vapid-menu">
      {!embedded ? <Menu
        adapter={adapter || null}
        theme={theme}
        templates={templates}
        records={records}
        pageId={pageId || INDEX_PAGE_ID}
        isLocal={isLocal}
        templateName={templateName || null}
        templateType={templateType || null}
        beforeDeploy={beforeDeploy}
        afterDeploy={afterDeploy}
      >
        {children}
      </Menu> : null}

      <section class="vapid-editor sidebar vapid-nav" id="vapid-editor">
        <Page adapter={adapter || null} isNewRecord={isNewRecord} template={template} record={active} parent={parent} records={records} theme={theme}
          onCancel={() => {
            delete drafts[draftKey];
            onChange(JSON.parse(JSON.stringify(record)));
            route(`/${template.type}/${template.name}/${(parent || record)?.slug || ''}`);
          }}
          onChange={record => {
            record.slug = record.slug || INDEX_PAGE_ID;
            const slugId = permalinks[DBRecord.permalink(record)];
            if ((slugId && slugId !== record.id) || /[^A-Za-z0-9-_.~]/.test(record.slug) || record.slug === 'new') {
              record.slug = `__error__/${record.slug}`;
            }
            onChange(JSON.parse(JSON.stringify(record)));
          }}
          onSave={(recordUpdates: IRecord | IRecord[], navigate?: boolean) => {
            delete drafts[draftKey];
            recordUpdates = Array.isArray(recordUpdates) ? recordUpdates : [recordUpdates];
            for (const record of recordUpdates) {
              records[record.id] = record;
              if (record.deletedAt) {
                const parent = record.parentId ? (records[record.parentId] || null) : null;
                const parentTemplate = parent ? (theme.hbs.templates[parent.templateId] || null) : null;
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
                onChange(JSON.parse(JSON.stringify(record)));
                const permalink = DBRecord.permalink(record, parent);
                route(`/${template.type}/${template.name}${(!permalink || permalink === '/') ? '/index' : permalink}`);
              }
            }
            setTheme({ ...theme });
            setRecords({ ...records });
          }}
        />
      </section>
    </menu>

    {createPortal(<Toaster />, document.getElementById('toasts') as HTMLElement)}
  </Fragment>;
}  
