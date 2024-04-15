import { IRecord,ITemplate, Template } from "@neutrinodev/core";
import { IWebsite } from "@neutrinodev/runtime";
import { Fragment } from "preact/jsx-runtime";

import { findDirective } from "./directives.js";
import { DraggableList } from "./DraggableList.js";

interface CollectionListProps {
  domain: string;
  template: ITemplate | null;
  page: IRecord | null;
  collection: IRecord[];
  theme: IWebsite;
  onChange: (order: number[]) => void | Promise<void>;
}

export default function CollectionList({ domain, template, page, collection, theme, onChange }: CollectionListProps) {
  if (!template || !page) { return null; }

  const items = collection.map((record) => {
    if (record.deletedAt) { return null; }
    return <li key={record.id} data-id={record.id} data-parent-id={page.id} class="collection__preview-row">
      <a href={`/${template.type}/${template.name}/${page.slug}/${record.slug}`} class="collection__row-select">
        <div class="collection__preview-value collection__preview-value--image">
          {Template.tableColumns(template).map(column => {
            const field = template?.fields?.[column];
            if (!field || field.type !== 'image') { return null; }
            const directive = findDirective(
              'content',
              domain,
              column,
              field,
              {
                templateId: record.templateId,
                record: null,
                records: [],
                media: theme.meta.media,
                website: theme.meta,
              },
            );
            return directive?.preview(record?.content?.[column] as unknown as never) || null;
          }).filter(Boolean).slice(0, 1)}
        </div>
        {Template.tableColumns(template).map(column => {
          const field = template?.fields?.[column];
          if (!field || field.type === 'image') { return null; }
          const directive = findDirective(
            'content',
            domain,
            column,
            field,
            {
              templateId: record.templateId,
              record: null,
              records: [],
              media: theme.meta.media,
              website: theme.meta,
            },
          );
          const rendered = directive?.preview(record?.content?.[column] as unknown as never) || null;
          return rendered ? <div key={`${field.templateId}-${field.key}`} class={`collection__preview-value collection__preview-value--${field.type}`}>{rendered}</div> : null;
        })}
      </a>
    </li>;
  });
  return <Fragment>
    <a href={`/collection/${template.name}/${page.slug}/new`} class="button collection__new">New {template.name}</a>
    <ol class={`collection__preview ${template.sortable ? 'draggable' : 'sortable'}`}>
      <DraggableList items={items} onChange={onChange} />
    </ol>
  </Fragment>;
}
