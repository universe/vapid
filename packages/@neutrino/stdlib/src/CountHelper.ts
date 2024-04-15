import { CollectionHelper, compileExpression } from '@neutrino/core';

export interface CountHelperOptions {
  filter?: string;
}

export default class CountHelper extends CollectionHelper<null, CountHelperOptions> {
  default = null;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  render([records]: [any | any[]], hash: CountHelperOptions = {}): number {
    const filter = hash.filter ? compileExpression(hash.filter) : null;
    let count = 0;
    records = (Array.isArray(records) ? records : [records]).filter(Boolean);
    for (const record of records) {
      if (record['@record']?.deletedAt) { continue; }
      count += (record && (!filter || filter(record))) ? 1 : 0;
    }
    return count;
  }
}
