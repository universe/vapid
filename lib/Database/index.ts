import { EventEmitter } from 'events';
import * as path from 'path';
import * as glob from 'glob';
import * as assert from 'assert';

import { TemplateCompiler } from '../TemplateCompiler';
import { ITemplate, Template } from './models/Template';
import { IProvider } from './providers';

const vapidCompiler = new TemplateCompiler();

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
        const old = finalTemplate.fields[field.key];
        finalTemplate.fields[field.key] = {
          // Merge with previous values if this field has been seen already.
          ...(old || {}),
          // Default to `type: text` if not specified.
          type: field.type || 'text',
          priority: field.priority || 0,
          label: field.label || '',
          key: field.key,
          options: { ...(old.options || {}), ...field.options },
        };
        // console.log(section.fields[fieldAttrs.key]);
      }
    }
  }

  return tree;
}

/**
 * Helps keep the database data structure in sync with the site templates
 */
export default class Database extends EventEmitter {
  private previous: Record<string, ITemplate> | null = null;
  private provider: IProvider;

  constructor(provider: IProvider) {
    super();
    this.provider = provider;
  }

  async start() { await this.provider.start(); }
  async stop() { await this.provider.stop(); }

  /**
   * Parses templates and updates the database
   */
  async rebuild() {

    if (!this.previous) {
      const templates = await this.provider.getAllTemplates();
      this.previous = templates.reduce<Record<string, Template>>((memo, template) => {
        memo[Template.identifier(template)] = template;
        return memo;
      }, {});
    }

    const tree = parse();

    // For every template file
    let existing: Promise<Template>[] = [];
    for (let template of Object.values(tree)) {
      existing.push(this.provider.updateTemplate(template));
    }

    await Promise.all(existing);

    this.previous = tree;

    this.emit('rebuild');
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
}
