import './Editor.css';

// import '../../../../core/directives/choice/index.css';
// import '../../../../core/directives/markdown/index.css';
import { BaseHelper, DirectiveField, DirectiveMeta,IField, IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, sortRecords } from '@neutrino/core';
import { IPageContext, IWebsite, makePageContext, resolveHelper,Template } from '@neutrino/runtime';
import { toTitleCase } from '@universe/util';
import FontPicker from 'font-picker-react';
import { Component,ComponentChildren, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Router } from 'preact-router';
import toast from 'react-hot-toast';

import { DataAdapter } from '../adapters/types.js';

// const DIRECTIVE_CACHE: Record<string, any> = {};

function findDirective(key: string, field: DirectiveField, meta: DirectiveMeta) {
  let helper = resolveHelper(field.type);
  if (!helper) {
    console.warn(`Directive type '${field.type}' does not exist. Falling back to 'text'`);
    helper = resolveHelper('text');
  }
  return helper ? new helper(key, field, meta) : null;
}

type DirectiveChangeCallback = Parameters<BaseHelper<string, {}>['onChange']>[0]

function templateFor(record: IRecord | null, templates: ITemplate[]): ITemplate | null {
  if (!record) { return null; }
  for (const template of templates) {
    if (record.templateId === Template.id(template)) { return template; }
  }
  return null;
}

interface EditorProps {
  isNewRecord: boolean;
  siteData: IWebsite;
  template: ITemplate;
  record: IRecord | null;
  parent: IRecord | null;
  adapter: DataAdapter;
  onChange: (record: IRecord) => void | Promise<void>;
  onSave: (record: IRecord) => void | Promise<void>;
  onCancel: (record: IRecord) => void | Promise<void>;
}

interface CollectionListProps {
  template: ITemplate | null;
  page: IRecord | null;
  collection: IRecord[];
  site: IWebsite;
}

function scrollToNav() {
  const $MAIN = document.getElementById('vapid-menu') as HTMLElement;
  $MAIN.scrollTo({ left: 0, behavior: 'smooth' });
}

function CollectionList({ template, page, collection, site }: CollectionListProps) {
  if (!template || !page) { return null; }
  return <Fragment>
    <a href={`/collection/${template.name}/${page.slug}/new`} class="button collection__new">New {template.name}</a>
    <ol class={`collection__preview ${template.sortable ? 'draggable' : 'sortable'}`}>
      {collection.map((record) => {
        if (record.deletedAt) { return null; }
        return <li data-id={record.id} data-parent-id={page.id} class="collection__preview-row">
          <a href={`/${template.type}/${template.name}/${page.slug}/${record.slug}`} class="collection__row-select">
            <div class="collection__preview-value collection__preview-value--image">
              {Template.tableColumns(template).map(column => {
                const field = template?.fields?.[column];
                if (!field || field.type !== 'image') { return null; }
                const directive = findDirective(column, field, { templateId: record.templateId, record: null, records: [], media: site.meta.media });
                return directive?.preview(record?.content?.[column] as unknown as any) || null;
              }).filter(Boolean).slice(0, 1)}
            </div>
            {Template.tableColumns(template).map(column => {
              const field = template?.fields?.[column];
              if (!field || field.type === 'image') { return null; }
              const directive = findDirective(column, field, { templateId: record.templateId, record: null, records: [], media: site.meta.media });
              const rendered = directive?.preview(record?.content?.[column] as unknown as any) || null;
              return <div class={`collection__preview-value collection__preview-value--${field.type}`}>{rendered}</div>;
            })}
          </a>
        </li>;
      })}
    </ol>
  </Fragment>;
}

function renderFields(type: 'page' | 'metadata' | 'content', fields: IField[], record: IRecord, context: IPageContext, onChange: DirectiveChangeCallback): ComponentChildren {
  const out: ComponentChildren[] = [];
  for (const field of fields) {
    if (!field) { continue; }
    const directive = findDirective(field.key, field, { templateId: record.templateId, record: context.page, records: context.pages, media: context.site.media });
    directive?.onChange(onChange as any);

    let value = null;
    switch (type) {
      case 'page': value = record[field.key] as any; break;
      case 'metadata': value = record.metadata?.[field.key] as any; break;
      case 'content': value = record.content?.[field.key] as any; break;
    }
    const Input = (directive?.input.bind(directive)) as (props: any) => JSX.Element;
    out.push(
      <div key={`${record.id}-${type}-${field.key}`} data-field={`this-${field.key}`} class={`${(field.options.required && !field.options.default) ? 'required' : ''} field field__${field.type || 'text'}`}>
        <label for={`content[${field.key}]`}>
          {field.options.label || toTitleCase(field.key)}
          {field.options.help && <small id={`help-content[${field.key}]`} class="help">{field.options.help}</small>}
        </label>
        <Input
          key={`${record.id}-${type}-${field.key}`}
          name={field.key}
          value={value ?? directive?.default}
          directive={directive}
        />
      </div>,
    );
  }
  return out;
}

export default function Editor({ adapter, isNewRecord, template, record, parent, siteData, onChange, onSave, onCancel }: EditorProps) {
  const [ metaOpen, setMetaOpen ] = useState(0);
  const templates = Object.values(siteData.hbs.templates);
  const records = Object.values(siteData.records);
  const parentTemplate = parent ? templateFor(parent, templates) : template;
  const childrenTemplate = parent ? template : siteData.hbs.templates[`${template?.name}-${PageType.COLLECTION}`];

  const collectionList: IRecord[] = [];
  for (const dat of records) {
    if (dat.parentId && (dat.parentId === record?.id || dat.parentId === parent?.id)) { collectionList.push(dat); }
  }
  collectionList.sort(sortRecords);

  function scrollToEdit() {
    setMetaOpen(document.getElementById('meta-container')?.scrollHeight || 0);
  }

  function onUpdate(rel: 'page' | 'metadata' | 'content' | 'collection', key: string, value: any) {
    const update: IRecord = JSON.parse(JSON.stringify(record));
    if (rel === 'page') {
      update[key] = value;
    }
 else {
      update[rel] = update[rel] || {};
      update[rel][key] = value;
    }
    onChange(update);
  }

  useEffect(() => {
    window.requestAnimationFrame(() => {
      (isNewRecord && !record?.parentId || record?.parentId === NAVIGATION_GROUP_ID) && scrollToEdit();
    });
  }, [isNewRecord]);

  if (!template) { return <div>404</div>; }

  const context = record ? makePageContext(record, records, templates, siteData) : null;
  const pageFields =  template && record && context ? renderFields('page', Template.pageFields(template), record || parent, context, onUpdate.bind(window, 'page')) : null;
  const metaFields =  template && record && context ? renderFields('metadata', Template.metaFields(template), record || parent, context, onUpdate.bind(window, 'metadata')) : null;
  const contentFields =  template && record && context ? renderFields('content', Template.sortedFields(template), record, context, onUpdate.bind(window, 'content')) : null;
  return <Fragment>
    <Router onChange={() => setMetaOpen(0)} />
    <nav class={`vapid-nav__heading vapid-nav--${isNewRecord ? 'new' : record?.id}`}>
      <button type="button" class="vapid-nav__back" onClick={(evt) => {
        evt.preventDefault();
        if (record?.parentId && record?.parentId !== NAVIGATION_GROUP_ID && parentTemplate) {
          onCancel(record);
        }
        else {
          scrollToNav();
        }
      }}>Cancel</button>
      <h1 class="heading">{isNewRecord ? 'New' : ''} {toTitleCase(template.name || '')} {childrenTemplate ? '' : toTitleCase(template.type || '')}</h1>
      {(template?.type !== PageType.SETTINGS) ? <ul class="basic fixed menu">
        <li><button class={`small button vapid-nav__settings ${metaOpen ? 'vapid-nav__settings--active' : ''}`} onClick={() => setMetaOpen(metaOpen ? 0 : document.getElementById('meta-container')?.scrollHeight || 0)}>Settings</button></li>
      </ul> : null}
    </nav>

    {!isNewRecord && childrenTemplate && parentTemplate && Object.values(parentTemplate?.fields || {}).length && Object.values(childrenTemplate?.fields || {}).length ? <ul class="sub-menu">
      <li><a href={`/page/${parentTemplate.name}/${(parent || record)?.slug || ''}`} class={`${template.type === PageType.PAGE ? 'active' : ''}`}>Page</a></li>
      <li><a href={`/collection/${childrenTemplate.name}/${(parent || record)?.slug || ''}`} class={`${template.type === PageType.COLLECTION ? 'active' : ''}`}>Records</a></li>
    </ul> : null}

    <form
      class="form"
      id="edit-form"
      method="post"
      encType="multipart/form-data"
      noValidate={true}
      onSubmit={async evt => {
        evt.preventDefault();
        console.log(record);
        const toastId = toast.loading('Saving Page...', {
          position: 'bottom-center',
          style: {
            fontFamily: 'fontawesome, var(--sans-stack)',
            background: 'white',
            color: 'black',
            fontWeight: 'bold',
          },
        });
        try {
          record ? await adapter.updateRecord(record) : null;
          setTimeout(() => {
            toast.success('Saved Successfully', {
              id: toastId,
              style: {
                fontFamily: 'fontawesome, var(--sans-stack)',
                background: 'var(--green-4)',
                color: 'white',
                fontWeight: 'bold',
              },
              icon: <div class="toast--success" />,
              duration: 3000,
            });
            record && onSave(record);
          }, 1000);
        }
 catch (err) {
          console.error(err);
          setTimeout(() => {
            toast.success('Error Saving', {
              id: toastId,
              style: {
                fontFamily: 'fontawesome, var(--sans-stack)',
                background: 'var(--red-4)',
                color: 'white',
                fontWeight: 'bold',
              },
              icon: <div class="toast--error" />,
              duration: 3000,
            });
          }, 1000);
        }
      }}
    >
      <section
        id="meta-container"
        class={`metadata ${isNewRecord || metaOpen ? 'open' : ''}`}
        style={{ height: `${metaOpen}px` }}
      >
        <div class="content">
          {pageFields}
          {metaFields}
          {!isNewRecord && template.type !== PageType.SETTINGS ? <button
            type="button"
            class="metadata__delete floated left basic red button"
            onClick={async() => {
              const toastId = toast.loading('Deleting Page...', {
                position: 'bottom-center',
                style: {
                  fontFamily: 'fontawesome, var(--sans-stack)',
                  background: 'white',
                  color: 'black',
                  fontWeight: 'bold',
                },
              });
              try {
                record ? await adapter.deleteRecord(record) : null;
                toast.success('Successfully Deleted', {
                  id: toastId,
                  style: {
                    fontFamily: 'fontawesome, var(--sans-stack)',
                    background: 'var(--green-4)',
                    color: 'white',
                    fontWeight: 'bold',
                  },
                  icon: <div class="toast--success" />,
                  duration: 3000,
                });
                record && (record.deletedAt = Date.now());
                record && onSave(record);
              }
 catch (err) {
                toast.success('Error Deleting', {
                  id: toastId,
                  style: {
                    fontFamily: 'fontawesome, var(--sans-stack)',
                    background: 'var(--red-4)',
                    color: 'white',
                    fontWeight: 'bold',
                  },
                  icon: <div class="toast--error" />,
                  duration: 3000,
                });
              }
            }}
          >Delete</button> : null}
        </div>
      </section>
      <section class="content">
        {((parent && !record && template.type === PageType.COLLECTION) || (template.type === PageType.PAGE && !Object.values(parentTemplate?.fields || {}).length) && collectionList) ?
          <CollectionList page={parent || record} template={childrenTemplate} collection={collectionList} site={siteData} /> :
          contentFields
        }
      </section>
      <FontPicker apiKey="AIzaSyC-t_Olbb1fWpCVhYPwr_DfxMu3_sWmc_c" onChange={console.log} categories={["handwriting"]} />
      <nav class="submit field" style="overflow: hidden;">
        <input class="button floated right" type="submit" value="Save" />
      </nav>
    </form>
  </Fragment>;
}