import './Editor.css';

import { useState } from 'preact/hooks';
import { Fragment, ComponentChildren } from 'preact';

import type { ISiteData } from '../../index';
import { Template, ITemplate, IRecord, IField, PageType, sortRecords } from '../../../../Database/models/index';
import { IPageContext, findDirective, makePageContext, DirectiveChangeCallback } from '../../../../TemplateRuntime';
import toast from 'react-hot-toast';

import { toTitleCase } from '@universe/util';

function templateFor(record: IRecord | null, templates: ITemplate[]): ITemplate | null {
  if (!record) { return null; }
  for (const template of templates) {
    if (record.templateId === Template.id(template)) { return template; }
  }
  return null;
}

interface EditorProps {
  isNewRecord: boolean;
  siteData: ISiteData;
  template: ITemplate;
  record: IRecord | null;
  parent: IRecord | null;
  onChange: (record: IRecord) => void | Promise<void>;
}

interface CollectionListProps {
  template: ITemplate | null;
  page: IRecord | null;
  collection: IRecord[];
  site: ISiteData;
}

function scrollToNav() {
  const $MAIN = document.getElementById('main') as HTMLElement;
  $MAIN.scrollTo({ left: 0, behavior: 'smooth' })
}

function CollectionList({ template, page, collection, site }: CollectionListProps) {
  if (!template || !page) { return null; }
  return <Fragment>
    <a href={`/collection/${template.name}/${page.slug}/new`} class="small button button--right">New {template.name}</a>
    <table class={`preview table ${template.sortable ? 'draggable' : 'sortable'}`}>
      <thead>
        <tr>
          {Template.tableColumnsHeaders(template).map(header => <th>{header}</th>)}
          <th class="no-sort"></th>
        </tr>
      </thead>
      <tbody>
        {collection.map((record) => {
          return <tr data-id={record.id} data-parent-id={page.id}>
            {Template.tableColumns(template).map(column => {
              const field = template?.fields?.[column];
              if (!field) { return null; }
              const directive = findDirective(column, field, { record: null, records: [], media: site.media });
              const rendered = directive.preview(record?.content?.[column] as unknown as any);
              return <td>{rendered}</td>
            })}
            <td class="right aligned">
              <a href={`/${template.type}/${template.name}/${page.slug}/${record.slug}`} class="small basic button">
                Edit
              </a>
            </td>
          </tr>
        })}
      </tbody>
    </table>
  </Fragment>;
}

let directiveCache: Record<string, ReturnType<typeof findDirective>> = {};
function renderFields(type: 'page' | 'metadata' | 'content', fields: IField[], record: IRecord, context: IPageContext, onChange: DirectiveChangeCallback): ComponentChildren {
  const out: ComponentChildren[] = [];
  for (const field of fields) {
    if (!field) { continue; }
    const directive = directiveCache[record.id + field.key] = directiveCache[record.id + field.key] || findDirective(field.key, field, { record: context.page, records: context.pages, media: context.media });
    directive.onChange(onChange as any);
    const RenderInput = directive.input;
    let value = null;
    switch (type) {
      case 'page': value = record[field.key] as any; break;
      case 'metadata': value = record.metadata?.[field.key] as any; break;
      case 'content': value = record.content?.[field.key] as any; break;
    }
    out.push(
      <div key={`${record.id}-${type}-${field.key}`} data-field={`this-${field.key}`} class={`${(field.options.required && !field.options.default) ? 'required' : ''} field field__${field.type || 'text'}`}>
        <label for={`content[${field.key}]`}>
          {field.options.label || toTitleCase(field.key)}
          {field.options.help && <small id={`help-content[${field.key}]`} class="help">{field.options.help}</small>}
        </label>
        <RenderInput key={`${record.id}-${type}-${field.key}`} name={field.key} value={value ?? directive.default} directive={directive} />
      </div>,
    );
  }
  return out
}

export default function Editor({ isNewRecord, template, record, parent, siteData, onChange }: EditorProps) {
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
  console.log('list', collectionList, childrenTemplate);
  function onUpdate(rel: 'page' | 'metadata' | 'content', key: string, value: any) {
    console.log('change', rel, key, value);
    const update: IRecord = JSON.parse(JSON.stringify(record));
    if (rel === 'page') {
      update[key] = value;
    } else {
      update[rel][key] = value;
    }
    onChange(update);
  }

  if (!template) { return <div>404</div>; }

  const context = record ? makePageContext(record, records, templates, siteData) : null;
  const pageFields =  template && record && context ? renderFields('page', Template.pageFields(template), record || parent, context, onUpdate.bind(window, 'page')) : null;
  const metaFields =  template && record && context ? renderFields('metadata', Template.metaFields(template), record || parent, context, onUpdate.bind(window, 'metadata')) : null;
  const contentFields =  template && record && context ? renderFields('content', Template.sortedFields(template), record, context, onUpdate.bind(window, 'content')) : null;

  return <Fragment>
    <nav class="vapid-nav__heading">
      <button type="button" class="vapid-nav__back" onClick={(evt) => { evt.preventDefault(); scrollToNav(); }}>Cancel</button>
      <h1 class="heading">{isNewRecord ? 'New' : ''} {toTitleCase(template.name || '')} {childrenTemplate ? 'Collection' : toTitleCase(template.type || '')}</h1>
      {(template?.type !== PageType.SETTINGS) ? <ul class="basic fixed menu">
        <li><button class="small button" onClick={() => setMetaOpen(metaOpen ? 0 : document.getElementById('meta-container')?.scrollHeight || 0)}>Settings</button></li>
      </ul> : null}
    </nav>

    {!isNewRecord && childrenTemplate && parentTemplate && Object.values(parentTemplate?.fields || {}).length && Object.values(childrenTemplate?.fields || {}).length ? <ul class="sub-menu">
      <li><a href={`/page/${parentTemplate.name}/${(parent || record)?.slug || ''}`} class={`${template.type === PageType.PAGE ? 'active' : ''}`}>Page</a></li>
      <li><a href={`/collection/${childrenTemplate.name}/${(parent || record)?.slug || ''}`} class={`${template.type === PageType.COLLECTION ? 'active' : ''}`}>Records</a></li>
    </ul> : null}

    <form
      class="form"
      action={`/api/${template?.type}/${template?.name}/${[ parent?.slug , isNewRecord ? 'new' : record?.slug ].filter(Boolean).join('/')}`}
      id="edit-form"
      method="post"
      encType="multipart/form-data"
      noValidate={true}
      onSubmit={async evt => {
        evt.preventDefault();
        console.log(record);
        const url = document.getElementById('edit-form')?.getAttribute('action');
        if (!url) { return; }
        const toastId = toast.loading('Saving Page...', {
          position: 'bottom-center',
          style: {
            fontFamily: 'fontawesome, var(--sans-stack)',
            background: 'white',
            color: 'black',
            fontWeight: 'bold',
          }
        });
        const res = await window.fetch(url, {
          method: 'POST',
          headers: {
            'x-csrf-token': siteData.csrf,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });
        const data = await res.json();
        setTimeout(() => {
          if (data.status === 'success') {
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
          } else {
            toast.success('Saved Successfully', {
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
        }, 1000)
      }}
    >
      <section id="meta-container" class={`metadata ${isNewRecord || metaOpen ? 'open' : ''}`} style={{ height: `${metaOpen}px` }}>
        <div class="content">
          {pageFields}
          {metaFields}
          {!isNewRecord && template.type !== PageType.SETTINGS ? <input
            type="submit"
            class="floated left basic red button"
            onClick={() => (document.getElementById('delete-record') as HTMLInputElement).value = 'true'}
            value="Delete"
          /> : null}
        </div>
      </section>
      <section class="content">
        {((parent && !record && template.type === PageType.COLLECTION) || (template.type === PageType.PAGE && !Object.values(parentTemplate?.fields || {}).length) && collectionList) ?
          <CollectionList page={parent || record} template={childrenTemplate} collection={collectionList} site={siteData} /> :
          contentFields
        }
      </section>
      <nav class="submit field" style="overflow: hidden;">
        <input class="button floated right" type="submit" value="Save" />
        <input type="hidden" id="delete-record" name="id" value={record?.id} />
        <input type="hidden" id="delete-record" name="_delete" value="false" />
        <input type="hidden" name="_csrf" value={siteData.csrf} />
      </nav>
    </form>
  </Fragment>
}