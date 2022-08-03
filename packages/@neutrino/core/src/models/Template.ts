import { Json, toTitleCase } from "@universe/util";
import * as fs from 'fs';
import * as path from 'path';
import pluralize from 'pluralize';

import { IField, ITemplate, PageType, templateId } from '../types.js';

export class Template implements ITemplate {
  name: string;
  sortable: boolean;
  options: Json;
  fields: Record<string, IField | undefined>;
  metadata: Record<string, IField | undefined>;
  type: PageType;

  constructor(data: ITemplate) {
    this.type = data.type;
    this.name = data.name;
    this.options = data.options;
    this.sortable = data.sortable;
    this.fields = data.fields;
    this.metadata = data.metadata;
  }

  get id(): string {
    return templateId(this);
  }

  static id(template: ITemplate): string {
    return templateId(template);
  }

  /**
   * Generates a user-friendly label
   * Allows template to override default behavior
   *
   * @return {string}
   */
  label() {
    if (this.type === 'page' && this.name === 'index') { return 'Home'; }
    return this.options.label as string || toTitleCase(this.name);
  }

  /**
   * Singularized label
   *
   * @return {string}
   */
  labelSingular() {
    return pluralize.singular(this.label());
  }

  /**
   * Singularized type
   *
   * @return {string}
   */
  typeSingular() {
    return pluralize.singular(this.type);
  }

  /**
   * Table column
   * Primarily used by dashboard index page
   *
   * @return {array} first three fields
   */
  static tableColumns(template: ITemplate): string[] {
    return Object.keys(template.fields).sort((key1, key2) => {
      const val1 = template.fields[key1];
      const val2 = template.fields[key2];
      if ((val1?.priority || Infinity) > (val2?.priority || Infinity)) { return 1; }
      if ((val1?.priority || Infinity) < (val2?.priority || Infinity)) { return -1; }
      if (key1 === 'title' || key1 === 'name') { return -1; }
      if (key2 === 'title' || key2 === 'name') { return 1; }
      if (key1 === key2) { return 0; }
      return key1 > key2 ? 1 : -1;
    }).slice(0, 4);
  }

  /**
   * User-friendly headers for table columns
   *
   * @return {array}
   */
  static tableColumnsHeaders(template: ITemplate) {
    return Template.tableColumns(template).map(key => template.fields[key]?.label || toTitleCase(key));
  }

  /**
   * Quick way to check if Template has any fields
   *
   * @return {boolean}
   */
  hasFields() {
    return Object.keys(this.fields).length > 0;
  }

  /**
   * Sort fields by priority
   *
   * @return {array}
   */
  static sortedFields(template: ITemplate) {
    return Object.entries(template.fields)
      .reduce<IField[]>((result, [ key, value ]) => [ ...result, { ...value, _name: key }] as IField[], [])
      .sort((a, b) => (parseInt(`${a.priority}`, 10) < parseInt(`${b.priority}`, 10) ? -1 : 1));
  }

  sortedFields() { return Template.sortedFields(this); }

  static pageFields(_template: ITemplate): IField[] {
    return [
      {
        type: 'text',
        priority: 0,
        label: '',
        key: 'name',
        templateId: null,
        options: { help: 'Human readable name used for site navigation.' },
      }, {
        type: 'url',
        priority: 1,
        label: '',
        key: 'slug',
        templateId: null,
        options: {
          type: 'url',
          help: 'The URL where this page can be found.',
          prefix: null,
        },
      }, {
        type: 'date',
        priority: 2,
        label: '',
        key: 'createdAt',
        templateId: null,
        options: { type: 'date', help: 'Date created.', time: true },
      }, {
        type: 'date',
        priority: 3,
        label: '',
        key: 'updatedAt',
        templateId: null,
        options: { type: 'date', help: 'Last updated.', time: true },
      },
    ];
  }
  pageFields() { return Template.pageFields(this); }

  static metaFields(template: ITemplate): IField[] {
    return Object.entries(template.metadata || {})
      .reduce<IField[]>((result, [ key, value ]) => [ ...result, { ...value, _name: key }] as IField[], [])
      .sort((a, b) => (parseInt(`${a.priority}`, 10) < parseInt(`${b.priority}`, 10) ? -1 : 1));
  }
  metaFields() { return Template.metaFields(this); }

  isCollection() { return this.type === 'collection'; }
  hasCollection() { return fs.existsSync(path.join(process.env.TEMPLATES_PATH || process.cwd(), 'collections', `${this.name}.html`)); }
  isPage() { return this.type === 'page'; }
  hasPage() { return true; }
  hasView() { return (this.isPage() && this.hasPage()) || (this.isCollection() && this.hasCollection()); }

  toJSON(): ITemplate {
    return {
      name: this.name,
      type: this.type,
      sortable: this.sortable,
      fields: this.fields,
      metadata: this.metadata,
      options: this.options,
    };
  }
}
