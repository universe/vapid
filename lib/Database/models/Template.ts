import * as fs from 'fs';
import * as path from 'path';
import { Json, toTitleCase } from "@universe/util";
import * as pluralize from 'pluralize';

export const enum PageType {
  SETTINGS = 'settings',
  COLLECTION = 'collection',
  PAGE = 'page',
  COMPONENT = 'component',
}

export function isPageType(value: any): value is PageType {
  return value === PageType.SETTINGS || value === PageType.COLLECTION || value === PageType.PAGE || value === PageType.COMPONENT;
}
export interface IField {
  type: string;
  priority: number;
  label: string;
  key: string;
  options: Record<string, string | number | boolean | null>;
}

export function stampField(field: Partial<IField> = {}) {
  return {
    type: 'text',
    priority: 0,
    label: '',
    key: 'field',
    options: {},
    ...field,
  }
}

export interface ITemplate {
  id: number;
  name: string;
  sortable: boolean;
  options: Json;
  fields: Record<string, IField | undefined>;
  type: PageType;
}

export function stampTemplate(template: Partial<ITemplate> = {}) {
  return {
    id: NaN,
    name: '',
    sortable: false,
    options: {},
    fields: {},
    type: PageType.PAGE,
    ...template,
  };
}

export class Template implements ITemplate {
  id: number = NaN;
  name: string;
  sortable: boolean;
  options: Json;
  fields: Record<string, IField | undefined>
  type: PageType;

  constructor(data: ITemplate) {
    this.id = data.id;
    this.type = data.type
    this.name = data.name;
    this.options = data.options;
    this.sortable = data.sortable;
    this.fields = data.fields
  }

  static identifier(template: ITemplate): string {
    return `${template.type}:${template.name}`.toLowerCase();
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
  tableColumns(): string[] {
    return Object.keys(this.fields).sort((key1, key2) => {
      const val1 = this.fields[key1];
      const val2 = this.fields[key2];
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
  tableColumnsHeaders() {
    return this.tableColumns().map(key => this.fields[key]?.label || toTitleCase(key));
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
  sortedFields() {
    return Object.entries(this.fields)
      .reduce<IField[]>((result, [key, value]) => [...result, { ...value, _name: key }] as IField[], [])
      .sort((a, b) => (parseInt(`${a.priority}`, 10) < parseInt(`${b.priority}`, 10) ? -1 : 1));
  }

  metaFields(): IField[] {
   return [
      {
        type: 'text',
        priority: 0,
        label: '',
        key: 'name',
        options: { help: 'Human readable name used for site navigation.' },
      }, {
        type: 'url',
        priority: 1,
        label: '',
        key: 'slug',
        options: {
          type: 'url',
          help: 'The URL where this page can be found.',
          prefix: '/' + (this.type === 'collection' ? (null ? ({} as any)?.permalink : this.name) : ''),
          // default: record && record.defaultSlug,
        },
      }, {
        type: 'text',
        priority: 2,
        label: '',
        key: 'title',
        options: { help: "This page's title, as will appear in search results." },
      }, {
        type: 'text',
        priority: 3,
        label: '',
        key: 'description',
        options: { help: "This page's description, as will appear in search results." },
      }, {
        type: 'text',
        priority: 4,
        label: '',
        key: 'redirectUrl',
        options: { help: 'Redirect this page to a new location.' },
      }, {
        type: 'date',
        priority: 5,
        label: '',
        key: 'createdAt',
        options: { type: 'date', help: 'Date created.', time: true },
      },
    ];
  }

  isCollection() { return this.type === 'collection'; }
  hasCollection() { fs.existsSync(path.join(process.env.TEMPLATES_PATH || process.cwd(), 'collections', `${this.name}.html`)); }

  isPage() { return this.type === 'page'; }
  hasPage() { return fs.existsSync(path.join(process.env.TEMPLATES_PATH || process.cwd(), `${this.name}.html`)); }

  /**
   * If this template has a backing view to render a dedicated page.
   *
   * @return {boolean}
   */
  hasView() {
    if (this.type === 'page') {
      return fs.existsSync(path.join(process.env.TEMPLATES_PATH || process.cwd(), `${this.name}.html`));
    }
    if (this.type === 'collection') {
      return fs.existsSync(path.join(process.env.TEMPLATES_PATH || process.cwd(), 'collections', `${this.name}.html`));
    }
    return false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      sortable: this.sortable,
      options: this.options,
      fields: this.fields,
      type: this.type,
      label: this.label(),
      labelSingular: this.labelSingular(),
      typeSingular: this.typeSingular(),
      tableColumns: this.tableColumns(),
      tableColumnsHeaders: this.tableColumnsHeaders(),
      hasFields: this.hasFields(),
      sortedFields: this.sortedFields(),
      metaFields: this.metaFields(),
      isCollection: this.isCollection(),
      hasCollection: this.hasCollection(),
      isPage: this.isPage(),
      hasPage: this.hasPage(),
      hasView: this.hasView(),
    }
  }
}
