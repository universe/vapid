
import { readFileSync } from 'fs';
import { basename, dirname } from 'path';

import { PageType } from '../Database/models/Template';
import {
  NeutrinoHelper,
  CollectionHelper,
  IfHelper,
  UnlessHelper,
  CollateHelper,
  EachHelper,
  EqHelper,
  MathHelper,
  LinkHelper,
  ImageHelper,
  DateHelper,
 } from './helpers';
 import { ComponentResolver, DATA_SYMBOL, IParsedTemplate, GlimmerTemplate } from './types';
 import { render } from './renderer';
 import { parse } from './parser';

/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
 export class TemplateCompiler {

  private helpers: Record<string, NeutrinoHelper> = {};
  private resolveComponent: ComponentResolver;

  static get DATA_SYMBOL() { return DATA_SYMBOL; }

  /**
   * @param {object} partials – The partials to make available in this project.
   * @param {array} helpers - Additional helpers to make available in this project.
   */
  constructor(resolveComponent: ComponentResolver = () => '', helpers: Record<string, NeutrinoHelper> = {}) {
    this.resolveComponent = resolveComponent;

    // Register native helpers
    this.registerHelper('collection', CollectionHelper);
    this.registerHelper('if', IfHelper);
    this.registerHelper('unless', UnlessHelper);
    this.registerHelper('collate', CollateHelper);
    this.registerHelper('each', EachHelper);
    this.registerHelper('eq', EqHelper);
    this.registerHelper('math', MathHelper);
    this.registerHelper('link', LinkHelper);
    this.registerHelper('image', ImageHelper);
    this.registerHelper('date', DateHelper);

    // Register 3rd party helpers
    for (const [name, helper] of Object.entries(helpers)) {
      this.registerHelper(name, helper);
    }
  }

  // Wrap all helpers so we unwrap function values and SafeStrings
  registerHelper(name: string, helper: NeutrinoHelper) {
    this.helpers[name] = helper;
  }


  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  parseFile(filePath: string): IParsedTemplate {
    const html = readFileSync(filePath, 'utf8');
    const name = basename(filePath, '.html');
    let type: PageType = PageType.PAGE;
    if (dirname(filePath).endsWith('collections')) {
      type = PageType.COLLECTION;
    } else if (dirname(filePath).endsWith('components') || name.startsWith('_')) {
      type = PageType.COMPONENT;
    }

    return parse(name, type, html, this.resolveComponent, this.helpers);
  }


  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  renderFile(filePath: string, content = {}, data = {}) {
    const { name, type, ast } = this.parseFile(filePath);
    return render(name, type, ast, this.resolveComponent, this.helpers, content, data);
  }

  render(name: string, type: PageType, ast: GlimmerTemplate | string, content = {}, data = {}) {
    return render(name, type, ast, this.resolveComponent, this.helpers, content, data)
  }

}
