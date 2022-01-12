import { Json, toTitleCase } from "@universe/util";
import * as pluralize from 'pluralize';

import { Template } from './Template';
import { PageType, IRecord, SerializedRecord } from '../types';

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
    let defaultName = this.template.name === 'index' ? 'Home' : this.template.name;
    if (this.template.type === PageType.PAGE) { return this.#name as string || toTitleCase(defaultName); }
    if (this.template.type === PageType.SETTINGS) { return this.template.name; }
    if (this.template.type === PageType.COLLECTION) { defaultName = pluralize.singular(defaultName); }
    return this.#name as string || toTitleCase(this.slug || defaultName);
  }

  static isNavigation(record: IRecord) { return record.parentId === 'navigation'; }
  isNavigation() { Record.isNavigation(this); }


  /**
   * URI path to an individual record
   *
   * @return {string}
   */
  static permalink(record: IRecord, parent: IRecord | null = null) {
    const slug = record.slug === 'index' ? '' : record.slug;
    return parent ? `/${parent.slug}/${slug}` : `/${slug}`;
  }
  permalink(): string { return Record.permalink(this, this.parent); }

  static getMetadata(currentUrl: string, record: IRecord, children: IRecord[] = [], parent: IRecord | null = null): SerializedRecord {
    const permalink = Record.permalink(record, parent);
    currentUrl = currentUrl === 'index' ? '/' : currentUrl;
    return {
      id: record.id,
      templateId: record.templateId,
      name: record.name || toTitleCase(record.templateId),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      slug: record.slug,
      permalink,
      isNavigation: Record.isNavigation(record),
      isActive: currentUrl === permalink,
      isParentActive: currentUrl === permalink || currentUrl.indexOf((parent ? Record.permalink(parent) : null) || '/') === 0,
      hasChildren: !!children.length,
      children: children.filter(r => r.parentId !== record.id).map(r => Record.getMetadata(currentUrl, r, [], record)),
      parent: parent ? Record.getMetadata(currentUrl, parent) : null,

      content: JSON.parse(JSON.stringify(record.content)),
      metadata: JSON.parse(JSON.stringify(record.metadata)),
    };
  }

  async getMetadata(currentUrl: string, children: IRecord[] = [], parent: IRecord | null = null): Promise<SerializedRecord> {
    return Record.getMetadata(currentUrl, this, children, parent)
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
    }
  }
}
