import { Json, toKebabCase, toTitleCase } from "@universe/util";
import * as pluralize from 'pluralize';

import { Template } from './Template';
import { IProvider } from "../providers";

export interface IRecord {
  id: number;
  templateId: number;
  content: Json;
  metadata: Json;
  position: number;
  slug: string;
  createdAt: number;
  updatedAt: number;
}

export interface SerializedRecord {
  id: number;
  name: string;
  url: string | null;
  slug: string | null;
  isNavigation: boolean;
  isActive: boolean;
  title: string | null;
  description: string | null;
  redirectUrl: string | null;
  hasSubNav: boolean;
  subNav: SerializedRecord[];
  createdAt: number;
  updatedAt: number;
  hasCollection: boolean;
  template: string;
};

export class Record implements IRecord {

  constructor(data: IRecord, template: Template) {
    this.template = template;
    this.id = data.id;
    this.templateId = data.templateId;
    this.content = data.content;
    this.metadata = data.metadata;
    this.position = data.position;
    this.slug = data.slug;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  template: Template;
  id: number = 0;
  templateId: number;
  createdAt: number;
  updatedAt: number;
  content: Json;
  metadata: Json;
  position: number;
  slug: string;

  isFirst() {
    return this.id === 0;
  }

  defaultName(): string {
    const defaultName = this.template.name === 'index' ? 'Home' : this.template.name;
    return this.isFirst() ? defaultName : `${defaultName} ${this.id}`;
  }

  name(): string {
    if (this.template.type === 'page') {
      return toTitleCase(this.metadata.name as string || this.defaultName());
    }
    return toTitleCase(this.metadata.name as string || this.slug || this.defaultName());
  }

  defaultSlug() {
    const name = toKebabCase(this.content.title as string || this.content.name as string || '');
    if (this.isFirst() && this.template.name === 'index') { return ''; }
    // if (this.isFirst && name) { return name; }
    return `${name || this.template.name}-${this.id}`;
  }

  safeSlug() {
    const customSlug = (this.slug || '').replace(`{${this.template.id}}`, '');
    if (this.isFirst() && this.template.name === 'index') { return 'index'; }
    return customSlug || this.defaultSlug();
  }

  /**
   * URI path to the individual record
   *
   * @return {string}
   */
  permalink() {
    const safeSlug = this.safeSlug();
    let slug = (safeSlug === 'index' || safeSlug === '') ? '' : safeSlug;
    return this.template.type === 'collection' ? `/${this.template.name}/${slug}` : `/${slug}`;
  }

  /**
   * Singularized name
   *
   * @return {string}
   */
  nameSingular(): string {
    return pluralize.singular(this.name());
  }

  async getMetadata(currentUrl: string, provider?: IProvider): Promise<SerializedRecord> {
    const permalink = this.permalink();
    const collection = provider ? await provider.getCollectionByName(this.template.name) : null;
    return {
      id: this.id,
      name: this.name(),
      url: this.template.hasView() ? this.permalink() : null,
      slug: this.template.hasView() ? this.safeSlug() : null,
      isNavigation: !!this.metadata.isNavigation,
      isActive: permalink === '/' ? (permalink === currentUrl || currentUrl === 'index') : currentUrl.indexOf(permalink) === 0,
      title: this.metadata.title as string || null,
      description: this.metadata.description as string || null,
      redirectUrl: this.metadata.redirectUrl as string || null,
      hasSubNav: !!(collection && collection.records.length && collection.template.hasView()),
      subNav: await Promise.all(((collection || {}).records || []).map(r => r.getMetadata(currentUrl))),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hasCollection: !!collection,
      template: this.template.name,
    };
  }

  toJSON() {
    return {
      id: this.id,
      template: this.template.toJSON(),
      templateId: this.templateId,
      content: this.content,
      metadata: this.metadata,
      position: this.position,
      slug: this.slug,
      isFirst: this.isFirst(),
      defaultName: this.defaultName(),
      name: this.name(),
      defaultSlug: this.defaultSlug(),
      safeSlug: this.safeSlug(),
      permalink: this.permalink(),
      nameSingular: this.nameSingular(),
    }
  }
}
