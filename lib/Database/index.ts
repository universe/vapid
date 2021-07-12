import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import * as assert from 'assert';

import { TemplateCompiler } from '../TemplateCompiler';
import { Template, ITemplate, PageType } from './models/Template';
import { Record as DBRecord, IRecord } from './models/Record';
import { IProvider } from './providers';

function componentLookup(tag: string): string {
  return fs.readFileSync(path.join(process.env.TEMPLATES_PATH, 'components', `${tag}.html`), 'utf8');
}

const vapidCompiler = new TemplateCompiler(componentLookup);

/**
 * Crawls templates, and creates object representing the data model
 *
 * @param {array} templates - array of file paths
 * @return {Object} template tree
 */
function parse(): Record<string, ITemplate> {
  const tree: Record<string, ITemplate> = {};
  const templates = glob.sync(path.resolve(process.env.TEMPLATES_PATH, '**/*.html'));
  for (const tpl of templates) {
    const parsed = vapidCompiler.parseFile(tpl).data;

    for (const [parsedName, parsedTemplate] of Object.entries(parsed)) {
      // We merge discovered fields across files, so we gradually collect configurations
      // for all sections here. Get or create this shared object as needed.
      const finalTemplate: ITemplate = tree[parsedName] = tree[parsedName] || {
        sortable: false,
        type: null,
        name: null,
        options: {},
        fields: {},
      };

      // Ensure the section name and type are set.
      finalTemplate.name = finalTemplate.name || parsedTemplate.name;
      finalTemplate.type = finalTemplate.type || parsedTemplate.type;

      // Merge section options
      Object.assign(finalTemplate.options, parsedTemplate.options);

      // For every field discovered in the content block, track them in the section.
      for (const [, field] of Object.entries(parsedTemplate.fields)) {
        if (!field) { continue; }
        const old = finalTemplate.fields[field.key];
        finalTemplate.fields[field.key] = {
          // Merge with previous values if this field has been seen already.
          ...(old || {}),
          // Default to `type: text` if not specified.
          type: field.type || 'text',
          priority: field.priority || 0,
          label: field.label || '',
          key: field.key,
          options: { ...(old?.options || {}), ...field.options },
        };
      }
    }
  }

  return tree;
}

/**
 * Helps keep the database data structure in sync with the site templates
 */
export default class Database extends IProvider {
  private previous: Record<string, ITemplate> | null = null;
  private provider: IProvider;

  constructor(provider: IProvider) {
    super(provider);
    this.provider = provider;
  }

  private callbacks: Set<() => void> = new Set();
  onRebuild(cb: () => void) { this.callbacks.add(cb); }

  getAllTemplates(): Promise<ITemplate[]> { return this.provider.getAllTemplates(); }
  getAllRecords(): Promise<IRecord[]> { return this.provider.getAllRecords(); }
  getTemplateById(id: number): Promise<ITemplate | null> { return this.provider.getTemplateById(id); }
  getTemplateByName(name: string, type: PageType): Promise<ITemplate | null> { return this.provider.getTemplateByName(name, type); }
  getTemplatesByType(type: PageType): Promise<ITemplate[]> { return this.provider.getTemplatesByType(type); }
  getRecordById(id: number): Promise<IRecord | null> { return this.provider.getRecordById(id); }
  getRecordBySlug(slug: string): Promise<IRecord | null> { return this.provider.getRecordBySlug(slug); }
  getRecordsByTemplateId(id: number): Promise<IRecord[]> { return this.provider.getRecordsByTemplateId(id); }
  getRecordsByType(type: PageType): Promise<IRecord[]> { return this.provider.getRecordsByType(type); }
  getChildren(id: number): Promise<IRecord[]> { return this.provider.getChildren(id); }
  updateTemplate(template: ITemplate): Promise<ITemplate> { return this.provider.updateTemplate(template); }
  updateRecord(record: IRecord): Promise<IRecord> { return this.provider.updateRecord(record); }
  deleteTemplate(templateId: number): Promise<void> { return this.provider.deleteTemplate(templateId); }
  deleteRecord(recordId: number): Promise<void> { return this.provider.deleteRecord(recordId); }

  async start() {
    await this.provider.start();

    await this.provider.updateTemplate({
      id: 0,
      sortable: false,
      type: PageType.SETTINGS,
      name: 'general',
      options: {},
      fields: {},
    });

    await this.provider.updateRecord({
      id: 0,
      templateId: 0,
      parentId: null,
      content: {},
      metadata: {},
      position: 0,
      slug: 'general',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await this.provider.updateTemplate({
      id: 1,
      sortable: false,
      type: PageType.PAGE,
      name: 'index',
      options: {},
      fields: {},
    });

    await this.provider.updateRecord({
      id: 1,
      templateId: 1,
      parentId: null,
      content: {},
      metadata: {},
      position: 0,
      slug: 'index',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  }
  async stop() { await this.provider.stop(); }

  /**
   * Parses templates and updates the database
   */
  async rebuild() {
    if (!this.previous) {
      const templates = await this.provider.getAllTemplates();
      this.previous = templates.reduce<Record<string, ITemplate>>((memo, template) => {
        memo[Template.identifier(template)] = template;
        return memo;
      }, {});
    }

    const tree = parse();

    // For every template file
    let existing: Promise<ITemplate>[] = [];
    for (let template of Object.values(tree)) {
      existing.push(this.provider.updateTemplate(template));
    }

    await Promise.all(existing);

    this.previous = tree;

    // this.emit('rebuild');
  }

  /**
   * Determines if tree has changed since last build
   *
   * @todo Cache so this isn't as taxing on the load time
   */
  isDirty() {
    // TODO: Should remove _permalink and other special fields
    try {
      assert.deepStrictEqual(parse(), this.previous);
      return false;
    } catch (_err) {
      return true;
    }
  }

  async getIndex(): Promise<DBRecord | null> {
    const template = await this.getTemplateByName('index', PageType.PAGE);
    if (!template) { return null; }
    const record = (await this.getRecordsByTemplateId(template.id))[0] || null;
    return record ? new DBRecord(record, new Template(template)) : null;
  }

  async getGeneral(): Promise<DBRecord | null> {
    const template = await this.getTemplateByName('general', PageType.SETTINGS);
    if (!template) { return null; }
    const record = (await this.getRecordsByTemplateId(template.id))[0] || null;
    return record ? new DBRecord(record, new Template(template)) : null;
  }

  async getRecordFromPath(permalink: string): Promise<DBRecord | null> {

    // Alias root requests.
    if (permalink.endsWith('/')) { permalink = permalink.slice(0, -1); }
    if (permalink === '' || permalink === '/') { permalink = 'index'; }

    // If we have an exact match, opt for that.
    let record = await this.provider.getRecordBySlug(permalink);
    let tmpl = record ? await this.provider.getTemplateById(record.templateId) : null;
    if (record && tmpl) { return new DBRecord(record, new Template(tmpl)); }

    // If a slug doesn't match perfectly, then any slashes in the name might come from a
    // collection specifier. Parse this like a collection record.
    if (permalink.includes('/')) {
      const segments = permalink.split('/');
      const collection = segments.shift();
      const slug = segments.join('/');
      const tmpl = collection ? await this.provider.getTemplateByName(collection, PageType.COLLECTION) : null;
      if (!tmpl) { return null; }
      const template = new Template(tmpl);

      // Try to get the plain old slug value if it exists.
      record = await this.provider.getRecordBySlug(`{${template.id}}${slug}`);
      if (record) { return new DBRecord(record, template); }

      // Otherwise, this must be a {template_name}-{record_id} slug. Grab the ID.
      const id = slug.split('-').pop();
      record = id ? await this.provider.getRecordById(parseInt(id)) : null;
    }

    // Otherwise, this is a {template_name}-{record_id} slug for a page. Grab the ID.
    const parts = permalink.split('-');
    const id = parts.length > 1 ? parts.pop() : null;
    record = id ? await this.provider.getRecordById(parseInt(id, 10)) : null;
    tmpl = record ? await this.provider.getTemplateById(record.templateId) : null;
    return (record && tmpl) ? new DBRecord(record, new Template(tmpl)) : null;
  }
}
