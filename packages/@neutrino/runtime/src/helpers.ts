import { BaseHelper, CollectionHelper, Helper, ValueHelper } from '@neutrino/core';
import stdlib from '@neutrino/stdlib';

export type GenericHelper = Helper | ValueHelper<unknown, object> | CollectionHelper<unknown, object>;
type HelperNames = keyof typeof stdlib;
const HELPERS: Record<string, typeof stdlib[HelperNames]> = {};

for (const [ name, helper ] of Object.entries(stdlib)) {
  if (!Object.prototype.isPrototypeOf.call(BaseHelper.prototype, helper?.prototype)) { continue; }
  HELPERS[name] = helper;
}

export type UnknownHelper = typeof stdlib[HelperNames];
export type HelperResolver = (key: string) => typeof stdlib[HelperNames] | null;
export function resolveHelper(type = 'text'): typeof stdlib[HelperNames] | null { return HELPERS[type] || null; }
