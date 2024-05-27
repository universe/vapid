import './Page.css';

import { IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, sortRecords } from '@neutrinodev/core';
import { makePageContext, Template } from '@neutrinodev/runtime';
import { Json, toTitleCase } from '@universe/util';
import { Fragment } from 'preact';
import { useContext,useEffect, useState } from 'preact/hooks';
import { Router } from 'preact-router';

import { DataContext } from "../Data/index.js";
import CollectionList from './CollectionList.js';
import { renderFields } from './directives.js';
import { scrollToNav } from './Menu.js';
import { attemptWithToast } from './save.js';

interface EditorProps {
  isNewRecord: boolean;
  template: ITemplate;
  record: IRecord | null;
  parent: IRecord | null;
  onChange: (record: IRecord) => void | Promise<void>;
  onSave: (record: IRecord | IRecord[], navigate?: boolean) => void | Promise<void>;
  onCancel: (record: IRecord) => void | Promise<void>;
}

export default function Page({ isNewRecord, template, record, parent, onChange, onSave, onCancel }: EditorProps) {
  const { domain, theme, templates, records, templateFor } = useContext(DataContext);

  const [ metaOpen, setMetaOpen ] = useState(0);
  const [ isDirty, setIsDirty ] = useState(false);
  const parentTemplate = parent ? templateFor(parent) : template;
  const childrenTemplate = parent ? template : templates[`${template?.name}-${PageType.COLLECTION}`];
  // const isPage = theme.hbs.pages[`${template?.name}-${template?.type}`];

  // Assemble all records that are members of the selected collection.
  const collectionRecords: IRecord[] = Object.values(records).filter((dat) => {
    return (dat.parentId && !dat.deletedAt && (dat.parentId === record?.id || dat.parentId === parent?.id));
  }).sort(sortRecords);

  function onUpdate(rel: 'page' | 'metadata' | 'content', key: string, value: Json) {
    if (!record) { return; }
    const update: IRecord = structuredClone(record);
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

  useEffect(() => { setIsDirty(false); }, [ record?.id, domain ]);

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
  const context = (current && theme) ? makePageContext(false, current, records, templates, theme) : null;

  // Generate all renderable fields for page metadata, theme metadata, and page content.
  /* eslint-disable max-len */
  const pageFields = current && context ? renderFields(domain, 'page', Template.pageFields(template), current, context, onUpdate.bind(window, 'page')) : null;
  const metaFields = current && context ? renderFields(domain, 'metadata', Template.metaFields(template), current, context, onUpdate.bind(window, 'metadata')) : null;
  const contentFields = record && context ? renderFields(domain, 'content', Template.sortedFields(template), record, context, onUpdate.bind(window, 'content')) : null;
  /* eslint-enable max-len */

  const templateName = toTitleCase(template.name);
  const slugError = current?.slug?.startsWith('__error__');
  const slug = current?.slug?.toLowerCase().replace('__error__/', '').replaceAll(/[^a-z0-9_-]/g, '');
  return <Fragment>
    <Router onChange={() => setMetaOpen(0)} />
    <nav class={`vapid-nav__heading vapid-nav--${template.type} vapid-nav--${isNewRecord || isDirty ? 'new' : record?.id}`}>
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
      {template.type === PageType.SETTINGS 
        ? <h2 class="vapid-nav__settings-header-name">{templateName?.toLowerCase()?.endsWith('settings') ? templateName : `${templateName} Settings`}</h2>
        : <form class="vapid-nav__page-header">
          <input
            class="vapid-nav__page-header-name"
            placeholder={templateName}
            value={current?.name || ''}
            onInput={(evt) => {
              onUpdate('page', 'name', (evt.target as HTMLInputElement).value as unknown as Json);
            }}
          />
          <fieldset class={`vapid-nav__page-header-url vapid-nav__page-header-url--${slugError ? 'error' : 'ok'}`}>
            <span class="vapid-nav__page-header-parent-slug">{(current?.templateId?.endsWith('collection') && parent?.slug) ? `/${parent?.slug}/` : null}</span>
            <input
              class="vapid-nav__page-header-slug"
              placeholder="Page URL"
              value={(slug === 'index' ? '/' : `/${slug || ''}`) || ''}
              onInput={(evt) => {
                onUpdate('page', 'slug', (evt.target as HTMLInputElement).value.toLowerCase().replaceAll(/[^a-z0-9_-]/g, '') as unknown as Json);
              }}
            />
          </fieldset>
        </form>
      }
      {/* <h1 class="heading">{isNewRecord ? 'New' : ''} {toTitleCase(template.name || '')} {childrenTemplate ? '' : toTitleCase(template.type || '')}</h1> */}
      {(template.type !== PageType.SETTINGS) ? <ul class="basic fixed menu">
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
      <li><a href={`/page/${parentTemplate.name}/${(parent || record)?.slug || ''}`} class={`sub-menu--page ${template.type === PageType.PAGE ? 'active' : ''}`}>Page</a></li>
      <li><a href={`/collection/${childrenTemplate.name}/${(parent || record)?.slug || ''}`} class={`sub-menu--records ${template.type === PageType.COLLECTION ? 'active' : ''}`}>Records</a></li>
    </ul> : null}
    {/* eslint-enable max-len */}

    <form
      class="form"
      id="edit-form"
      method="post"
      encType="multipart/form-data"
      noValidate={true}
      onSubmit={evt => evt.preventDefault()}
    >
      <section
        id="meta-container"
        class={`metadata ${(isNewRecord || metaOpen) ? 'open' : ''}`}
        style={{ height: `${(isNewRecord && template.type === PageType.SETTINGS) ? 0 : metaOpen}px` }}
      >
        {pageFields}
        {metaFields}
        {!isNewRecord && template.type !== PageType.SETTINGS ? <button
          type="button"
          class="metadata__delete floated left basic red button"
          onClick={async () => {
            await attemptWithToast(async (): Promise<void> => {
              if (!record) { return; }
              const update = structuredClone(record);
              update.deletedAt = Date.now();
              await onSave(update);
            }, 'Deleting Page...', 'Successfully Deleted', 'Error Deleting');
          }}
        >Delete</button> : null}
      </section>
      <section class="content">
        {/* eslint-disable max-len */}
        {((parent?.id == record?.id && template.type === PageType.COLLECTION) || (template.type === PageType.PAGE && !Object.values(parentTemplate?.fields || {}).length) && collectionRecords) ?
          <CollectionList domain={domain} page={parent || record} template={childrenTemplate} collection={collectionRecords} theme={theme} onChange={async (order) => {
            if (!order) { return; }
            return attemptWithToast(async () => {
              const working = structuredClone([...collectionRecords]);
              const updates: IRecord[] = [];
              for (let i = 0; i < working.length; i++) {
                const record = working[i];
                const newIndex = order.indexOf(i);
                if (!record || record.order === newIndex) { continue; }
                record.order = newIndex;
                updates.push(record);
              }
              await onSave(updates, false);
            }, 'Saving Page...', 'Saved Successfully', 'Error Saving');
          }} /> :
          contentFields
        }
        {/* eslint-enable max-len */}
      </section>
      <nav class="submit field" style="overflow: hidden;">
        <input class="button floated right" type="submit" value="Save Draft" onClick={async() => {
          await attemptWithToast(async () => {
            record && await onSave(record);
            setIsDirty(false);
          }, 'Saving Page...', 'Saved Successfully', 'Error Saving');
        }} />
      </nav>
    </form>
  </Fragment>;
}