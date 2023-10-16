import { appendFragment, CollectionHelper as BaseCollectionHelper, compileExpression, DirectiveProps, NeutrinoHelperOptions, RECORD_META } from '@neutrino/core';

interface CollectionHelperValue {
  collectionId: string | null;
  limit: number | null;
  sort: string | null;
  order: 'asc' | 'desc';
}

interface CollectionHelperOptions {
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
    return { ...value };
  }

  /**
   * Renders either a text or textarea input
   */
  input({ name, directive, value = this.default }: DirectiveProps<CollectionHelperValue>) {
    if (directive.meta.templateId === `${directive.key}-page`) { return null; }
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
        return record.templateId === `${directive.key}-page` ? <option value={record.id}>{record.name}</option> : null;
      })}
    </select>;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  render([ data, config ]: [any[], CollectionHelperValue], hash: CollectionHelperOptions = {}, options: NeutrinoHelperOptions) {
    const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
    const limit = hash.limit || Infinity;
    const filter = hash.filter ? compileExpression(hash.filter) : null;

    if (!options.fragment) { throw new Error('The {{collection}} helper must be used as a block helper.'); }

    // If collection is empty, and the helper provides an empty state, render the empty state.
    if (items.length === 0) return options.inverse?.() || '';

    // Otherwise, render each item!
    const out = options.fragment;
    let index = 0;
    for (const item of items) {
      if (index >= limit) { break; }
      if (item['@record']?.deletedAt) { continue; }
      if (config.collectionId && item['@record']?.parent?.id !== config.collectionId) { continue; }
      if (!config.collectionId && item['@record']?.parent?.id !== config.collectionId) { continue; }
      if (item.deletedAt) { continue; }
      if (filter && !filter(item)) { continue; }

      appendFragment(out, options.block?.([item], {
        index,
        length: items.length,
        first: index === 0,
        last: index === items.length - 1,
        next: items[index + 1],
        prev: items[index - 1],
        record: item[RECORD_META],
      }));
      index += 1;
    }
    return out;
  }
}
