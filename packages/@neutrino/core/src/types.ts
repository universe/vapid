import { Json, toKebabCase } from '@universe/util';
import { customAlphabet } from 'nanoid';
import pluralize from 'pluralize';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export enum PageType {
  SETTINGS = 'settings',
  COLLECTION = 'collection',
  PAGE = 'page',
  COMPONENT = 'component',
}

export const NAVIGATION_GROUP_ID = 'navigation';
export const GENERAL_SETTINGS_ID = 'general';
export const INDEX_PAGE_ID = 'index';

export function isPageType(value: any): value is PageType {
  return value === PageType.SETTINGS || value === PageType.COLLECTION || value === PageType.PAGE || value === PageType.COMPONENT;
}

export interface IField<DirectiveTypes=string> {
  type: DirectiveTypes;
  priority: number;
  label: string;
  key: string;
  templateId: string | null;
  options: Record<string, string | number | boolean | null>;
}

export interface ITemplate {
  name: string;
  sortable: boolean;
  options: Json;
  fields: Record<string, IField | undefined>;
  metadata: Record<string, IField | undefined>;
  type: PageType;
}

export interface IRecord {
  id: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  templateId: string;
  parentId: string | null;

  name: string | null;
  order: number | null;

  metadata: Json;
  content: Json;
}

export interface SerializedRecord {
  id: string;
  slug: string | null;
  templateId: string;
  name: string;
  createdAt: number;
  updatedAt: number;

  permalink: string | null;
  isNavigation: boolean;
  isActive: boolean;
  isParentActive: boolean;
  hasChildren: boolean;
  children: SerializedRecord[];
  parent: SerializedRecord | null;

  metadata: Json;
  content: Json;
}

export const RECORD_META = '@record';
export type IRecordData = { [RECORD_META]: SerializedRecord } & Json;

export function stampField(field: Partial<IField> = {}): IField {
  return {
    type: 'text',
    priority: 0,
    label: '',
    key: 'field',
    templateId: null,
    options: {},
    ...field,
  };
}

export function templateId(template: ITemplate) {
  return `${template.name}-${template.type}`.toLowerCase();
}

export function stampRecord(template: ITemplate, record: Partial<IRecord> = {}): IRecord {
  const name = toKebabCase(template.type === PageType.COLLECTION ? pluralize.singular(template.name) : template.name);
  const id = nanoid();

  return {
    id,
    templateId: templateId(template),
    slug: `${name}--${id}`,
    parentId: null,

    name: null,
    order: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,

    content: {},
    metadata: {},

    ...record,
  };
}

export function mergeField(field1: Partial<IField>, field2: IField): IField {
  const out = {
    // Default to `type: text` if not specified.
    type: (field2.type === 'text' ? field1.type : (field2.type || 'text')) || 'text',
    priority: Math.min(field1.priority || Infinity, field2.priority || Infinity),
    label: field2.label || field1.label || '',
    key: field2.key || field1.key || '',
    templateId: field2.templateId || field1.templateId || null,
    options: { ...(field1?.options || {}), ...field2.options },
  };
  delete out.options.type;
  delete out.options.priority;
  return out;
}

export function stampTemplate(template: Partial<ITemplate> & { name: string; type: PageType; }) {
  return {
    sortable: false,
    options: {},
    fields: {},
    metadata: {},
    ...template,
  };
}

export function sortRecords(a: IRecord, b: IRecord) {
  const ap = a.order ?? Infinity;
  const bp = b.order ?? Infinity;
  if (ap === bp) { a.createdAt > b.createdAt ? 1 : -1; }
  return ap > bp ? 1 : -1;
}

export function sortTemplates(a: ITemplate, b: ITemplate) {
  if (a.name === 'general') { return -1; }
  if (b.name === 'general') { return 1; }
  return a.name > b.name ? 1 : -1;
}

export function sortTemplatesAlphabetical(a: ITemplate, b: ITemplate) {
  return a.name > b.name ? 1 : -1;
}
