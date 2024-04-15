import { CollectionHelper as BaseCollectionHelper, compileExpression, DirectiveProps, NeutrinoHelperOptions } from '@neutrino/core';
import { Json } from '@universe/util';

export interface CollectionHelperValue {
  collectionId: string | null;
  limit: number | null;
  sort: string | null;
  order: 'asc' | 'desc';
}

export interface CollectionHelperOptions {
  templateId?: null,
  limit?: number;
  min?: number;
  max?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: string;
}

export default class CollectionHelper extends BaseCollectionHelper<CollectionHelperValue, CollectionHelperOptions> {
  default: CollectionHelperValue = {
    collectionId: null,
    limit: null,
    sort: null,
    order: 'desc',
  };

  async data(value: CollectionHelperValue) {
    for (const record of this.meta.records) {
      if (record.id === value?.collectionId) {
        return record.children;
      }
    }

    return [];
  }

  /**
   * Renders either a text or textarea input
   */
  input({ name, directive, value = this.default }: DirectiveProps<CollectionHelperValue>) {
    return <select
      {...this.options}
      name={name}
      className={`${value.collectionId ? 'selected' : ''}`}
      aria-describedby={`help-${name}`}
      value={value.collectionId || ''}
      onChange={(evt: Event) => {
        const el = (evt.target as HTMLSelectElement);
        value.collectionId = el.options[el.selectedIndex].value || null;
        this.update(value);
      }}
    >
      <option value="">No Collection Selected</option>
      {directive.meta.records.sort((r1, r2) => r1.createdAt > r2.createdAt ? 1 : -1).map(record => {
        return record.templateId === `${(this.options.templateId || '')}-page` ? <option value={record.id}>{record.name}</option> : null;
      })}
    </select>;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  render([ data, config ]: [any[], CollectionHelperValue], hash: CollectionHelperOptions = {}, _options: NeutrinoHelperOptions) {
    const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
    const limit = hash.limit || Infinity;
    const filter = hash.filter ? compileExpression(hash.filter) : null;

    // Otherwise, render each item!
    const out: Json[] = [];
    let index = 0;
    for (const item of items) {
      if (!item) { continue; }
      if (index >= limit) { break; }
      if (item['@record']?.deletedAt) { continue; }
      if (config?.collectionId && item['@record']?.parent?.id !== config?.collectionId) { continue; }
      if (item.deletedAt) { continue; }
      if (filter && !filter(item)) { continue; }
      out.push(item as Json);
      index += 1;
    }
    return out;
  }
}
