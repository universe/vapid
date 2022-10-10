import { CollectionHelper, compileExpression } from '@neutrino/core';

export interface CountHelperOptions {
  filter?: string;
}

export default class CountHelper extends CollectionHelper<null, CountHelperOptions> {
  default = null;
  render([ records, config ]: [any | any[], { collectionId: string }], hash: CountHelperOptions = {}): number {
    const filter = hash.filter ? compileExpression(hash.filter) : null;
    let count = 0;
    records = Array.isArray(records) ? records : [records];
    for (const record of records) {
      if (record['@record'].deletedAt) { continue; }
      if (!config || record['@record']?.parent?.id !== config.collectionId) { continue; }
      count += (record && (!filter || filter(record))) ? 1 : 0;
    }
    return count;
  }
}
