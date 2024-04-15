import { appendFragment, CollectionHelper, compileExpression, DirectiveProps, NeutrinoHelperOptions,SafeString } from '@neutrino/core';
import { toKebabCase, toTitleCase } from '@universe/util';

interface CollateHelperOptions { key?: string; default?: string; filter?: string; }

interface CollectionHelperValue {
  collectionId: string | null;
  limit: number | null;
  sort: string | null;
  order: 'asc' | 'desc';
}

export default class CollateHelper extends CollectionHelper<CollectionHelperValue, CollateHelperOptions> {
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
    const pageTemplateId = directive.meta.templateId?.replace('-collection', '-page');
    if (directive.meta.record?.templateId === pageTemplateId) { return null; }
    return <select
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
        return record.templateId === directive.meta.templateId ? <option value={record.id}>{record.name}</option> : null;
      })}
    </select>;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  render([ collection, config ]: [Record<string, any>[], any], hash: CollateHelperOptions, options: NeutrinoHelperOptions) {
    if (!options.fragment) { throw new Error('The {{collate}} helper must be used as a block helper.'); }

    const values: Set<string | number | undefined> = new Set();
    const valueCounts: Map<string | number | undefined, number> = new Map();
    const recordsMap: Map<string | number | undefined, Set<unknown>> = new Map();
    const out = options.fragment;
    const prop = hash.key;
    const filter = hash.filter ? compileExpression(hash.filter) : null;

    if (!prop) { throw new Error('You must provide a key to the `{{collate}}` helper.'); }

    for (const record of (collection || []).filter(Boolean)) {
      if (!record || record['@record']?.deletedAt) { continue; }
      if (config?.collectionId && record['@record']?.parent?.id !== config?.collectionId) { continue; }
      if (filter && !filter(record)) { continue; }

      let value = typeof record[prop] === 'function' ? record[prop]() : record[prop];
      if (!Array.isArray(value)) { value = (value ? [value] : []).filter(Boolean); }
      if (!value.length && hash.default) {
        values.add(undefined);
      }
      for (let v of value) {
        if (v instanceof SafeString) { v = v.toString(); }
        values.add(v);
        valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
        const records = recordsMap.get(v) || new Set();
        records.add(record);
        recordsMap.set(v, records);
      }
    }

    for (const value of values) {
      appendFragment(out, options.block?.([{
        toString() { return toTitleCase(`${value || hash.default || ''}`); },
        value,
        title: toTitleCase(`${value || hash.default || ''}`),
        slug: value ? toKebabCase(`${value}`) : toKebabCase(hash.default || ''),
        records: [...(recordsMap.get(value)|| [])],
        count: valueCounts.get(value) || 0,
      }]));
    }

    return out;
  }
}
