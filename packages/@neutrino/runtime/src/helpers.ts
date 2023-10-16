import { BaseHelper, CollectionHelper, Helper, ValueHelper } from '@neutrino/core';
import stdlib from '@neutrino/stdlib';

export type GenericHelper = Helper | ValueHelper<any, any> | CollectionHelper<any, any>;
type HelperNames = keyof typeof stdlib;
const HELPERS: Record<string, typeof stdlib[HelperNames]> = {};

for (const [ name, helper ] of Object.entries(stdlib)) {
  if (!Object.prototype.isPrototypeOf.call(BaseHelper.prototype, helper?.prototype)) { continue; }
  // TODO: Find a way to not require an instance to be made to get the helper name.
  HELPERS[name] = helper;
}

export type UnknownHelper = typeof stdlib[HelperNames];
export type HelperResolver = (key: string) => typeof stdlib[HelperNames] | null;
export function resolveHelper(type = 'text'): typeof stdlib[HelperNames] | null { return HELPERS[type] || null; }