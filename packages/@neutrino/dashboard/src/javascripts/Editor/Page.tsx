import './Page.css';

import { IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, sortRecords } from '@neutrino/core';
import { IWebsite, makePageContext, Template } from '@neutrino/runtime';
import { Json, toTitleCase } from '@universe/util';
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Router } from 'preact-router';

import { DataAdapter } from '../adapters/types.js';
import { templateFor } from '../utils.js';
import CollectionList from './CollectionList.js';
import { renderFields } from './directives.js';
import { attemptWithToast } from './save.js';

interface EditorProps {
  isNewRecord: boolean;
  theme: IWebsite;
  template: ITemplate;
  record: IRecord | null;
  records: Record<string, IRecord>;
  parent: IRecord | null;
  adapter: DataAdapter | null;
  onChange: (record: IRecord) => void | Promise<void>;
  onSave: (record: IRecord | IRecord[], navigate?: boolean) => void | Promise<void>;
  onCancel: (record: IRecord) => void | Promise<void>;
}

function scrollToNav() {
  const $MAIN = document.getElementById('vapid-menu') as HTMLElement;
  $MAIN.scrollTo({ left: 0, behavior: 'smooth' });
}

async function onSaveOrder(items: IRecord[], order: number[] | null, adapter: DataAdapter): Promise<IRecord[]> {
  if (!order) { return items; }
  return attemptWithToast(async () => {
    const working = [...items];
    const updates: IRecord[] = [];
    for (let i = 0; i < working.length; i++) {
      const record = working[i];
      const newIndex = order.indexOf(i);
      if (!record || record.order === newIndex) { continue; }
      record.order = newIndex;
      updates.push(record);
      await adapter?.updateRecord(record);
    }
    return updates;
  }, 'Saving Page...', 'Saved Successfully', 'Error Saving').catch(() => {
    return items;
  });
}

export default function Page({ adapter, isNewRecord, template, record, records, parent, theme, onChange, onSave, onCancel }: EditorProps) {
  const [ metaOpen, setMetaOpen ] = useState(0);
  const [ isDirty, setIsDirty ] = useState(false);
  const templates = Object.values(theme.hbs.templates);
  const parentTemplate = parent ? templateFor(parent, templates) : template;
  const childrenTemplate = parent ? template : theme.hbs.templates[`${template?.name}-${PageType.COLLECTION}`];
  const domain = adapter?.getDomain() || '';
  const isPage = theme.hbs.pages[`${template?.name}-${template?.type}`];

  // Assemble all records that are members of the selected collection.
  const collectionRecords: IRecord[] = Object.values(records).filter((dat) => {
    return (dat.parentId && !dat.deletedAt && (dat.parentId === record?.id || dat.parentId === parent?.id));
  }).sort(sortRecords);

  function onUpdate(rel: 'page' | 'metadata' | 'content', key: string, value: Json) {
    const update: IRecord = JSON.parse(JSON.stringify(record));
    if (rel === 'page') {
      /* eslint-disable-next-line */
      /* @ts-ignore */
      update[key] = value as typeof update[keyof IRecord];
    }
    else {
      update[rel] = update[rel] || {};
      update[rel][key] = value;
    }
    onChange(update);
    setIsDirty(true);
  }

  useEffect(() => { setIsDirty(false); }, [ record?.id, adapter?.getDomain() ]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (isNewRecord && (!record?.parentId || record?.parentId === NAVIGATION_GROUP_ID)) {
        setMetaOpen(document.getElementById('meta-container')?.scrollHeight || 0);
      }
    });
  }, [ isNewRecord, record?.parentId ]);

  // If we have no template, display a 404 page.
  if (!template) { return <div>404</div>; }

  const current = record || parent;
  const context = current ? makePageContext(false, current, records, templates, theme) : null;

  // Generate all renderable fields for page metadata, theme metadata, and page content.
  /* eslint-disable max-len */
  const pageFields = current && context ? renderFields(domain, 'page', Template.pageFields(template), current, context, onUpdate.bind(window, 'page')) : null;
  const metaFields = current && context ? renderFields(domain, 'metadata', Template.metaFields(template), current, context, onUpdate.bind(window, 'metadata')) : null;
  const contentFields = record && context ? renderFields(domain, 'content', Template.sortedFields(template), record, context, onUpdate.bind(window, 'content')) : null;
  /* eslint-enable max-len */

  return <Fragment>
    <Router onChange={() => setMetaOpen(0)} />
    <nav class={`vapid-nav__heading vapid-nav--${isNewRecord || isDirty ? 'new' : record?.id}`}>
      <button type="button" class="vapid-nav__back" onClick={(evt) => {
        evt.preventDefault();
        if ((record?.parentId && record?.parentId !== NAVIGATION_GROUP_ID && parentTemplate) || (record && isDirty)) {
          if (window.confirm('Are you sure you want to discard your changes?')) {
            onCancel(record);
            setIsDirty(false);
            scrollToNav();
          }
        }
        else {
          scrollToNav();
        }
      }}>Cancel</button>
      <h1 class="heading">{isNewRecord ? 'New' : ''} {toTitleCase(template.name || '')} {childrenTemplate ? '' : toTitleCase(template.type || '')}</h1>
      {(isPage || !isNewRecord) ? <ul class="basic fixed menu">
        <li>
          <button
            class={`small button vapid-nav__settings ${metaOpen ? 'vapid-nav__settings--active' : ''}`}
            onClick={() => setMetaOpen(metaOpen ? 0 : document.getElementById('meta-container')?.scrollHeight || 0)}
          >
            Settings
          </button>
        </li>
      </ul> : null}
    </nav>

    {/* eslint-disable max-len */}
    {!isNewRecord && childrenTemplate && parentTemplate && Object.values(parentTemplate?.fields || {}).length && Object.values(childrenTemplate?.fields || {}).length ? <ul class="sub-menu">
      <li><a href={`/page/${parentTemplate.name}/${(parent || record)?.slug || ''}`} class={`${template.type === PageType.PAGE ? 'active' : ''}`}>Page</a></li>
      <li><a href={`/collection/${childrenTemplate.name}/${(parent || record)?.slug || ''}`} class={`${template.type === PageType.COLLECTION ? 'active' : ''}`}>Records</a></li>
    </ul> : null}
    {/* eslint-enable max-len */}

    <form
      class="form"
      id="edit-form"
      method="post"
      encType="multipart/form-data"
      noValidate={true}
      onSubmit={async evt => {
        evt.preventDefault();
        await attemptWithToast(async () => {
          record ? await adapter?.updateRecord(record) : null;
          record && onSave(record);
          setIsDirty(false);
        }, 'Saving Page...', 'Saved Successfully', 'Error Saving');
      }}
    >
      <section
        id="meta-container"
        class={`metadata ${(isNewRecord || metaOpen) ? 'open' : ''}`}
        style={{ height: `${(isNewRecord && !isPage) ? 0 : metaOpen}px` }}
      >
        {pageFields}
        {metaFields}
        {!isNewRecord && template.type !== PageType.SETTINGS ? <button
          type="button"
          class="metadata__delete floated left basic red button"
          onClick={async () => {
            await attemptWithToast(async (): Promise<void> => {
              record ? await adapter?.deleteRecord(record) : null;
              record && (record.deletedAt = Date.now());
              record && onSave(record);
            }, 'Deleting Page...', 'Successfully Deleted', 'Error Deleting');
          }}
        >Delete</button> : null}
      </section>
      <section class="content">
        {/* eslint-disable max-len */}
        {((parent?.id == record?.id && template.type === PageType.COLLECTION) || (template.type === PageType.PAGE && !Object.values(parentTemplate?.fields || {}).length) && collectionRecords) ?
          <CollectionList domain={domain} page={parent || record} template={childrenTemplate} collection={collectionRecords} theme={theme} onChange={async (order) => {
            adapter && onSave(await onSaveOrder(collectionRecords, order, adapter), false);
          }} /> :
          contentFields
        }
        {/* eslint-enable max-len */}
      </section>
      <nav class="submit field" style="overflow: hidden;">
        <input class="button floated right" type="submit" value="Save" />
      </nav>
    </form>
  </Fragment>;
}