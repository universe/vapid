import { Json, toTitleCase } from "@universe/util";
import pluralize from 'pluralize';

import { INDEX_PAGE_ID, IRecord, ITemplate, NAVIGATION_GROUP_ID, PageType, SerializedRecord } from '../types.js';
import { Template } from './Template.js';

export class Record implements IRecord {
  id: string;
  templateId: string;
  template: Template;

  parentId: string | null;
  parent: Record | null;

  slug: string;
  #name: string | null;
  order: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;

  content: Json;
  metadata: Json;

  constructor(data: IRecord, template: Template, parent: Record | null) {
    this.id = data.id;
    this.templateId = data.templateId;
    this.template = template;
    this.parent = parent || null;
    this.parentId = data.parentId;

    this.#name = data.name;
    this.slug = data.slug;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    this.deletedAt = data.deletedAt || null;
    this.order = data.order;

    this.content = data.content;
    this.metadata = data.metadata;
  }

  set name(name: string) { this.#name = name; }
  get name(): string {
    return Record.getName(this.toJSON(), this.template);
  }

  static getName(record: IRecord, template: ITemplate): string {
    let defaultName = template.name === INDEX_PAGE_ID ? 'Home' : template.name;
    if (template.type === PageType.PAGE) { return record.name || toTitleCase(defaultName); }
    if (template.type === PageType.SETTINGS) { return template.name; }
    if (template.type === PageType.COLLECTION) { defaultName = pluralize.singular(defaultName); }
    return record.name as string || toTitleCase(record.slug || defaultName);
  }

  static isNavigation(record: IRecord) { return record.parentId === NAVIGATION_GROUP_ID; }
  isNavigation() { Record.isNavigation(this); }

  /**
   * URI path to an individual record
   *
   * @return {string}
   */
  static permalink(record: IRecord, parent: IRecord | null = null) {
    const slug = record.slug === INDEX_PAGE_ID ? '' : record.slug;
    return parent ? `/${parent.slug}/${slug}` : `/${slug}`;
  }
  permalink(): string { return Record.permalink(this, this.parent); }

  static getMetadata(currentUrl: string, record: IRecord, children: IRecord[] = [], parent: IRecord | null = null): SerializedRecord {
    const permalink = Record.permalink(record, parent);
    const parentPermalink = parent ? Record.permalink(parent) : '/';
    currentUrl = currentUrl === INDEX_PAGE_ID ? '/' : currentUrl;
    return {
      id: record.id,
      templateId: record.templateId,
      name: record.name || toTitleCase(record.templateId),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt || null,
      slug: record.slug,
      permalink,
      isNavigation: Record.isNavigation(record),
      isActive: currentUrl === permalink || currentUrl.startsWith(`${permalink}/`),
      isParentActive: currentUrl.startsWith(`${parentPermalink}/`),
      hasChildren: !!children.length,
      children: children.filter(r => r.parentId === record.id && !r.deletedAt).map(r => Record.getMetadata(currentUrl, r, [], record)),
      parent: parent ? Record.getMetadata(currentUrl, parent) : null,
      content: JSON.parse(JSON.stringify(record.content)),
      metadata: JSON.parse(JSON.stringify(record.metadata)),
    };
  }

  async getMetadata(currentUrl: string, children: IRecord[] = [], parent: IRecord | null = null): Promise<SerializedRecord> {
    return Record.getMetadata(currentUrl, this, children, parent);
  }

  toJSON(): IRecord {
    return {
      id: this.id,
      templateId: this.templateId,
      parentId: this.parentId,

      name: this.#name,
      slug: this.slug,
      order: this.order,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,

      metadata: this.metadata,
      content: this.content,
    };
  }
}
