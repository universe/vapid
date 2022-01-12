import { HelperResolver, NeutrinoHelper, ParsedExpr } from './types';

import { default as CollectionHelper } from './CollectionHelper';
import { default as IfHelper } from './IfHelper';
import { default as UnlessHelper } from './UnlessHelper';
import { default as CollateHelper } from './CollateHelper';
import { default as EachHelper } from './EachHelper';
import { default as EqHelper } from './EqHelper';
import { default as MathHelper } from './MathHelper';
import { default as LinkHelper } from './LinkHelper';
import { default as ImageHelper } from './ImageHelper';
import { default as DateHelper } from './DateHelper';
import { default as LogHelper } from './LogHelper';
import { default as AndHelper } from './AndHelper';
import { default as OrHelper } from './OrHelper';

export function resolveHelper(name: string): NeutrinoHelper | null {
  switch(name) {
    case 'collection': return CollectionHelper;
    case 'if': return IfHelper;
    case 'unless': return UnlessHelper;
    case 'collate': return CollateHelper;
    case 'each': return EachHelper;
    case 'eq': return EqHelper;
    case 'math': return MathHelper;
    case 'link': return LinkHelper;
    case 'image': return ImageHelper;
    case 'date': return DateHelper;
    case 'log': return LogHelper;
    case 'and': return AndHelper;
    case 'or': return OrHelper;
  }
  return null;
}

export {
  HelperResolver,
  NeutrinoHelper,
  ParsedExpr,
  CollectionHelper,
  IfHelper,
  UnlessHelper,
  CollateHelper,
  EachHelper,
  EqHelper,
  MathHelper,
  LinkHelper,
  ImageHelper,
  DateHelper,
  LogHelper,
  OrHelper,
  AndHelper,
}