import { Json, toKebabCase, toTitleCase } from "@universe/util";
import * as pluralize from 'pluralize';

import { Template } from './Template';
import { IProvider } from "../providers";

export interface IRecord {
  id: number;
  templateId: number;
  parentId: number | null;
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
  slug: string | null;
  title: string | null;
  description: string | null;
  redirectUrl: string | null;
  isNavigation: boolean;
  isActive: boolean;
  isParentActive: boolean;
  hasChildren: boolean;
  children: SerializedRecord[];
  createdAt: number;
  updatedAt: number;
  template: string;
};

export class Record implements IRecord {

  constructor(data: IRecord, template: Template) {
    this.template = template;
    this.id = data.id;
    this.templateId = data.templateId;
    this.parentId = data.parentId;
    this.content = data.content;
    this.metadata = data.metadata;
    this.position = data.position;
    this.slug = data.slug;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  id: number;
  templateId: number;
  parentId: number | null;
  createdAt: number;
  updatedAt: number;
  content: Json;
  metadata: Json;
  position: number;
  slug: string;

  template: Template;

  isFirst() {
    return this.id === 0;
  }

  defaultName(): string {
    let defaultName = this.template.name === 'index' ? 'Home' : this.template.name;
    if (this.template.type === 'collection') { defaultName = pluralize.singular(defaultName); }
    return this.isFirst() ? defaultName : `${defaultName} ${this.id}`;
  }

  name(): string {
    if (this.template.type === 'page') {
      return toTitleCase(this.metadata.name as string || this.defaultName());
    }
    return toTitleCase(this.metadata.name as string || this.slug || this.defaultName());
  }

  defaultSlug() {
    let name = this.content.title as string || this.content.name as string || '';
    name = name || (this.template.isCollection()) ? pluralize.singular(this.template.name) : this.template.name;
    name = toKebabCase(name);
    if (this.isFirst() && this.template.name === 'index') { return ''; }
    if (this.isFirst() && name) { return name; }
    return `${name}-${this.id}`;
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

  async getMetadata(currentUrl: string, provider: IProvider): Promise<SerializedRecord> {
    const permalink = this.permalink();
    const children = await provider.getChildren(this.id) || null;
    return {
      id: this.id,
      name: this.name(),
      template: this.template.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      slug: this.template.hasView() ? this.permalink() : null,
      isNavigation: !!this.metadata.isNavigation,
      hasChildren: !!children.length,
      children: await Promise.all(children.filter(r => r.id !== this.id).map(r => r.getMetadata(currentUrl, provider))),
      isActive: permalink === '/' ? (permalink === currentUrl || currentUrl === 'index') : currentUrl === permalink,
      isParentActive: permalink === '/' ? (permalink === currentUrl || currentUrl === 'index') : currentUrl.indexOf(permalink) === 0,

      title: this.metadata.title as string || null,
      description: this.metadata.description as string || null,
      redirectUrl: this.metadata.redirectUrl as string || null,
    };
  }

  toJSON() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      template: this.template.toJSON(),
      templateId: this.templateId,
      content: this.content || {},
      metadata: this.metadata || {},
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
