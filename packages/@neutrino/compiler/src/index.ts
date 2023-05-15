import { preprocess } from '@glimmer/syntax';
import {
  ITemplate,
  mergeField,
  PageType,
  stampTemplate,
  Template,
} from '@neutrino/core';
import {
  GlimmerTemplate,
  HelperResolver,
  IPageContext,
  IParsedTemplate,
  IParsedTemplates,
  IStylesheet,
  ITemplateAst,
  render,
  resolveHelper,
} from '@neutrino/runtime';
import Serializer from '@simple-dom/serializer';
import autoprefixer from 'autoprefixer';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import glob from 'glob';
import { basename, dirname, join, resolve } from 'path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import { Document } from 'simple-dom';

import { ComponentResolver, parse } from './parser.js';

/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
 export class TemplateCompiler {
  private resolveHelper: HelperResolver;
  private resolveComponent: ComponentResolver;

  /**
   * @param {object} partials – The partials to make available in this project.
   * @param {array} helpers - Additional helpers to make available in this project.
   */
  constructor(customResolveComponent: ComponentResolver = () => null, customResolveHelper: HelperResolver = () => null) {
    this.resolveComponent = customResolveComponent;
    this.resolveHelper = (name: string) => resolveHelper(name) || customResolveHelper(name);
  }

  private resolveComponentAst(name: string): GlimmerTemplate {
    const path = this.resolveComponent(name);
    if (!path) { throw new Error(`Unknown component <${name} />`); }
    return preprocess(path);
  }

  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  private parseFile(filePath: string): IParsedTemplate {
    const html = readFileSync(filePath, 'utf8');
    const name = basename(filePath, '.html');
    let type: PageType = PageType.PAGE;
    if (dirname(filePath).endsWith('collections')) {
      type = PageType.COLLECTION;
    }
    else if (dirname(filePath).endsWith('components') || name.startsWith('_')) {
      type = PageType.COMPONENT;
    }
    return parse(name, type, html, this.resolveComponent, this.resolveHelper);
  }

  async parse(root: string): Promise<IParsedTemplates> {
    const templates: Record<string, ITemplate> = {};
    const pages: Record<string, ITemplateAst> = {};
    const components: Record<string, ITemplateAst> = {};
    const stylesheets: Record<string, IStylesheet> = {};
    for (const tpl of glob.sync(resolve(root, '**/*.html'))) {
      const parsed = this.parseFile(tpl);
      const id = Template.id(parsed as unknown as ITemplate);
      pages[id] = {
        name: parsed.name,
        type: parsed.type,
        ast: parsed.ast,
      };

      for (const [ path, stylesheet ] of Object.entries(parsed.stylesheets)) {
        if (stylesheets[path]) { continue; }
        const from = join(root, path);
        stylesheet.content = (await postcss([
          postcssImport({ root: dirname(from) }) as any, /* Types are off... this works though. */
          autoprefixer,
        ]).process(readFileSync(from), { from, map: { inline: true } })).css;
        const hash = createHash('md5').update(stylesheet.content).digest('hex');
        stylesheet.path = `/stylesheets/${basename(path, '.css')}.${hash}.css`;
        stylesheets[path] = stylesheet;
      }

      for (const [ name, template ] of Object.entries(parsed.components)) {
        components[name] = template;
      }

      for (const [ parsedName, parsedTemplate ] of Object.entries(parsed.templates)) {
        // We merge discovered fields across files, so we gradually collect configurations
        // for all sections here. Get or create this shared object as needed.
        const finalTemplate: ITemplate = templates[parsedName] = templates[parsedName] || stampTemplate({ name: parsedTemplate.name, type: parsedTemplate.type });

        // Ensure the section name and type are set.
        finalTemplate.name = parsedTemplate.name || finalTemplate.name;
        finalTemplate.type = parsedTemplate.type || finalTemplate.type;

        // Merge section options
        Object.assign(finalTemplate.options, parsedTemplate.options);

        // For every content field discovered in the content block, track them in the section.
        for (const field of Object.values(parsedTemplate.fields)) {
          if (!field) { continue; }
          finalTemplate.fields[field.key] = mergeField(finalTemplate.fields[field.key] || {}, field);
        }

        // For every metadata field discovered in the content block, track them in the section.
        for (const field of Object.values(parsedTemplate.metadata)) {
          if (!field) { continue; }
          finalTemplate.metadata[field.key] = mergeField(finalTemplate.metadata[field.key] || {}, field);
        }
      }
    }

    // Normalize field priority orders.
    for (const template of Object.values(templates)) {
      let maxPriority = 0;
      for (const field of Object.values(template.fields)) {
        if (!field) { continue; }
        if (typeof field.priority === 'number' && !isNaN(field.priority) && field.priority !== Infinity) { maxPriority = Math.max(maxPriority, field.priority); }
      }

      for (const field of Object.values(template.fields)) {
        if (!field) { continue; }
        if (isNaN(field.priority) || field.priority === Infinity) { field.priority = ++maxPriority; }
      }
    }
    return {
      templates,
      pages,
      components,
      stylesheets,
    };
  }

  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  async render(tmpl: IParsedTemplate, data: IPageContext) {
    const document = new Document();
    await render(
      document,
      tmpl,
      data,
      this.resolveComponentAst.bind(this),
      this.resolveHelper.bind(this),
    );
    const serializer = new Serializer({});
    return serializer.serialize(document);
  }

}
