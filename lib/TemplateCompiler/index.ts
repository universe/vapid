// TODO: Clean this up. Lots of hacky stuff in here
import { readFileSync } from 'fs';
import { basename, dirname } from 'path';
import Boom from '@hapi/boom';
import Handlebars from 'handlebars';
import merge from 'lodash.merge';
import { SafeString } from 'handlebars';

import { Template, ITemplate, PageType, IField } from '../Database/models/Template';

import {
  IAlias,
  ParsedExpr,
  NeutrinoHelper,
  SectionHelper,
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

import { DATA_SYMBOL } from './constants';

type ASTNode = hbs.AST.BlockStatement
  | hbs.AST.PartialStatement
  | hbs.AST.PartialBlockStatement
  | hbs.AST.DecoratorBlock
  | hbs.AST.Decorator
  | hbs.AST.MustacheStatement
  | hbs.AST.ContentStatement
  | hbs.AST.CommentStatement
  | hbs.AST.SubExpression
  | hbs.AST.PathExpression
  | hbs.AST.StringLiteral
  | hbs.AST.NumberLiteral
  | hbs.AST.BooleanLiteral
  | hbs.AST.Hash
  | hbs.AST.Program
  | hbs.AST.Expression
  | hbs.AST.Statement;

interface IParsedTemplate {
  name: string;
  type: PageType;
  data: Record<string, ITemplate>
  ast: hbs.AST.Program,
}

function unwrap(func: (...args: any[]) => (string | SafeString)) {
  return function helperWrapper(...args: Parameters<typeof func>) {
    const values = [];
    for (let arg of args) {
      arg = (typeof arg === 'function') ? arg() : arg;
      arg = (arg instanceof Handlebars.SafeString) ? arg.toString() : arg;
      values.push(arg);
    }
    return func.apply(null, values);
  };
}

/* eslint-enable no-param-reassign */
function parseHash(hash: hbs.AST.Hash): Record<string, any> {
  const out = {};
  for (const pair of hash.pairs || []) {
    out[pair.key] = pair.value.original;
  }
  return out;
}

function missingData(context: hbs.AST.BlockStatement | hbs.AST.SubExpression | hbs.AST.MustacheStatement) {
  return (context.hash && context.hash.default) || `{{${context.path}}}`;
}

/**
 * TemplateCompiler class
 * Used in conjunction with a modified version of Mustache.js (Goatee)
 */
export class TemplateCompiler {

  private Handlebars: typeof Handlebars;
  private partials: Record<string, hbs.AST.Program>;
  private rawPartials: Record<string, string> = {};
  private helpers: Record<string, NeutrinoHelper> = {};

  /**
   * @param {object} partials – The partials to make available in this project.
   * @param {array} helpers - Additional helpers to make available in this project.
   */
  constructor(partials: Record<string, hbs.AST.Program> = {}, helpers: Record<string, NeutrinoHelper> = {}) {
    this.partials = partials;

    // Set up our Handlebars instance.
    // Vapid does not support the default helpers.
    this.Handlebars = Handlebars.create();

    // Register the ones we *do* support!
    this.registerHelper('collection', CollectionHelper);
    this.registerHelper('section', SectionHelper);

    this.registerHelper('if', IfHelper);
    this.registerHelper('unless', UnlessHelper);
    this.registerHelper('collate', CollateHelper);
    this.registerHelper('each', EachHelper);
    this.registerHelper('eq', EqHelper);

    this.registerHelper('math', MathHelper);

    this.registerHelper('link', LinkHelper);
    this.registerHelper('image', ImageHelper);
    this.registerHelper('date', DateHelper);

    // Special helper for logging missing data.
    this.Handlebars.registerHelper('helperMissing', missingData);

    // Register 3rd party helpers
    for (const [name, helper] of Object.entries(helpers)) {
      this.registerHelper(name, helper);
    }
  }

  static get DATA_SYMBOL() { return DATA_SYMBOL; }

  // Wrap all helpers so we unwrap function values and SafeStrings
  registerHelper(name: string, helper: NeutrinoHelper) {
    this.Handlebars.registerHelper(name, unwrap(helper.run));
    this.helpers[name] = helper;
  }

  // Get if a given string is a registered helper name.
  isHelper(name: string) {
    return !!this.helpers[name];
  }

  /**
   * Parses the HTML, and creates a template tree
   *
   * @return {Object} - a representation of the content
   */
  parse(name: string, type: PageType, html: string, data: Record<string, ITemplate> = {}, _aliases: Record<string, IAlias> = {}): IParsedTemplate {
    let ast: hbs.AST.Program;
    try {
      ast = Handlebars.parse(html);
    } catch (err) {
      throw Boom.boomify(err, { message: 'Bad template syntax' });
    }

    if (type !== PageType.COMPONENT) {
      /* eslint-disable-next-line no-param-reassign */
      const template: ITemplate = {
        name,
        type,
        options: {},
        fields: {},
        sortable: false,
      };
      data[Template.identifier(template)] = template;
    }

    this.walk(data, ast, {
      '': { name: 'general', type: PageType.SETTINGS, isPrivate: false },
      'this': { name, type, isPrivate: false },
    });

    return {
      name,
      type,
      data,
      ast,
    };
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
    } else if (dirname(filePath).endsWith('components')) {
      type = PageType.COMPONENT;
    }

    return this.parse(name, type, html);
  }

  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  render(name: string, type: PageType, html: hbs.AST.Program, context = {}, data = {}) {
    const ast = typeof html === 'string' ? this.parse(name, type, html) : html;
    return this.Handlebars.compile(ast, { knownHelpersOnly: false, explicitPartialContext: false })(
      context,
      { data },
    );
  }

  /**
   * Applies content to the template
   *
   * @param {Object} content
   * @return {string} - HTML that has tags replaced with content
   */
  renderFile(filePath: string, content = {}, data = {}) {
    const { name, type, ast } = this.parseFile(filePath);
    return this.render(name, type, ast, content, data);
  }

  /**
   * @private
   *
   * Recursively walks Mustache tokens, and creates a tree that Vapid understands.
   *
   * @param {Object} tree - a memo that holds the total tree value
   * @param {array} branch - Mustache tokens
   * @return {Object} tree of sections, fields, params, etc.
   */
  /* eslint-disable no-param-reassign */
  walk(data: Record<string, ITemplate>, node: ASTNode , aliases: Record<string, IAlias> = {}) {
    
    // Create a new copy of local aliases lookup object each time we enter a new block.
    aliases = Object.create(aliases);

    switch (node.type) {
      case 'Program':
        (node as hbs.AST.Program).body.forEach((n) => {
          this.walk(data, n, aliases);
        });
        break;

      // case 'DecoratorBlock': throw new Error('Vapid does not support Decorators.');
      // case 'Decorator': throw new Error('Vapid does not support Decorators.');

      case 'ContentStatement':
        // TODO: Components?
        break;

      case 'PathExpression': {
        const [leaf, path] = this.parseExpression(node);
        leaf && path && addToTree(data, leaf, path, aliases);
        break;
      }

      case 'MustacheStatement':
      case 'SubExpression': {
        // If this mustache has params, it must be a helper.
        // Crawl all its params as potential data values.
        if (node.params && node.params.length) {
          for (const param of node.params) {
            this.walk(data, param, aliases);
          }

        // Otherwise, this is a plain data value reference. Add it to the current object.
        } else {
          const [leaf, path] = this.parseExpression(node);
          leaf && path && addToTree(data, leaf, path, aliases);
        }
        break;
      }

      case 'BlockStatement': {
        // All Block statements are helpers. Grab the helper we're evaluating.
        const helper = this.helpers[node.path.original];

        // Crawl all its params as potential data values in scope.
        if (node.params.length && !helper.isBranch) {
          for (const param of node.params) {
            this.walk(data, param, aliases);
          }
        }

        // If this helper denotes the creation of a field, add it to the current model.
        if (helper.isField) {
          const [leaf, path] = this.parseExpression(node);
          if (leaf && path) {
            leaf.hash.type = helper.getType ? (helper.getType(leaf) || leaf.type) : leaf.type;
            addToTree(data, leaf, path, aliases);
          }
        }

        // If this helper denotes the creation of a new model type, ensure the model.
        if (helper.isBranch) {
          this.ensureBranch(data, node, helper);
        }

        // Assign any yielded block params to the aliases object.
        node.program.blockParams = node.program.blockParams || [];
        for (let idx = 0; idx < node.program.blockParams.length; idx += 1) {
          const param = node.program.blockParams[idx];
          aliases[param] = helper.blockParam(idx, node) || {
            name: param,
            type: PageType.SETTINGS,
            isPrivate: true,
          };
        }

        // Section tags change the `this` scope... This is special cased for now.
        if (node.path.original === 'section') {
          aliases[''] = {
            name: node.params[0].original,
            type: parseHash(node.hash).multiple === true ? PageType.COLLECTION : PageType.SETTINGS,
            isPrivate: !!node.params[0].data,
          };
        }

        if (node.program) this.walk(data, node.program, aliases);
        if (node.inverse) this.walk(data, node.inverse, aliases);
        break;
      }

      case 'PartialStatement':
      case 'PartialBlockStatement':
        // TODO: Ban partials?
        if (this.rawPartials[node.name.original]) {
          this.partials[node.name.original] = this.parse(
            aliases.this.name,
            aliases.this.type,
            this.rawPartials[node.name.original],
            data,
            aliases,
          ).ast;
        }
        if ((node as hbs.AST.PartialBlockStatement).program) this.walk(data, (node as hbs.AST.PartialBlockStatement).program, aliases);
        break;

      default: {
        /*
          Do nothing for:
            - CommentStatement
            - StringLiteral
            - NumberLiteral
            - BooleanLiteral
            - UndefinedLiteral
            - NullLiteral
        */
        break;
      }
    }

    return data;
  }

  /* eslint-disable prefer-destructuring */
  parseExpression(node:
      hbs.AST.MustacheStatement
    | hbs.AST.PathExpression
    | hbs.AST.BlockStatement
    | hbs.AST.MustacheStatement
    | hbs.AST.SubExpression
    | hbs.AST.Expression
  ): [ParsedExpr | null, hbs.AST.PathExpression | hbs.AST.Literal | null] {
    let path;
    let hash: Record<string, any> | null;

    switch (node.type) {
      case 'PathExpression':
        path = node;
        hash = {};
        break;
      case 'BlockStatement':
        path = this.parseExpression(node.params[0])[1];
        hash = parseHash(node.hash);
        break;
      case 'MustacheStatement':
      case 'SubExpression':
        if (node.params.length) {
          const tmp = this.parseExpression(node.params[0]);
          path = tmp[1];
          hash = tmp[0]?.hash || {};
        } else {
          path = node.path;
          hash = parseHash(node.hash);
        }
        break;
      default: {
        return [null, null];
      }
    }

    const context = path?.original.indexOf('this') === 0 ? 'this' : '';
    const key = (path as hbs.AST.PathExpression).parts?.length === 1 ? (path as hbs.AST.PathExpression).parts[0] : (path as hbs.AST.PathExpression).parts.slice(1).join('.');

    // TODO: Handle literal values
    return [{
      type: node.type,
      original: path?.original || '',
      key,
      context: (path as hbs.AST.PathExpression)?.parts?.length === 1 ? context : (path as hbs.AST.PathExpression)?.parts?.[0],
      path: path?.original || '',
      parts: (path as hbs.AST.PathExpression)?.parts,
      hash,
      isPrivate: !!path?.data,
    }, path];
  }

  ensureBranch(data: Record<string, ITemplate>, node: hbs.AST.BlockStatement | hbs.AST.DecoratorBlock, helper: NeutrinoHelper) {
    const [expr] = this.parseExpression(node);

    // If this is not an expression we care about, move on.
    if (!expr) { return; }

    // If this block is referencing a data property, don't add it to our data model.
    if (node.params.length && (node.params[0].data || expr.isPrivate)) { return; }

    // Record the type of this section appropriately
    const name = expr.context || expr.key;
    const newBranch: ITemplate = {
      name,
      type: helper.isBranch || PageType.PAGE,
      options: expr.hash,
      sortable: !!expr.hash.sortable,
      fields: {},
    };
    const branch = data[Template.identifier(newBranch)] = data[Template.identifier(newBranch)] || newBranch;
    merge(branch.options, newBranch.options);
    merge(branch.fields, newBranch.fields);
  }
}

/**
 * @private
 *
 * Parses a leaf token, and merges into the branch
 *
 * @params {string} leaf;
 * @params {string} path;
 * @params {string} tree;
 * @params {Object} aliases
 * @return {Object}
 */
function addToTree(data: Record<string, ITemplate>, leaf: ParsedExpr, path: hbs.AST.PathExpression | hbs.AST.Literal, aliases: Record<string, IAlias>) {
  // If this is a private path, no-op.
  if (!leaf || leaf.isPrivate) { return data; }

  // If this is a private section, no-op.
  const isPrivateSection = aliases[leaf.context] ? aliases[leaf.context].isPrivate : false;
  if (isPrivateSection) { return data; }

  // If this is a private key, no-op.
  const isPrivateKey = (!leaf.context && aliases[leaf.key]) ? aliases[leaf.key].isPrivate : false;
  if (isPrivateKey) { return data; }

  // Log a warning if we're referencing the default general context without an explicit reference.
  // Update the original path node so we can actually render the template.
  if (!leaf.context && !leaf.isPrivate && aliases[''] && aliases[''].name === 'general') {
    console.warn(`[DEPRECATION] Referencing values without a context is deprecated. Found: {{${leaf.original}}}`);
    leaf.context = 'general';
    (path as hbs.AST.PathExpression).parts.unshift('general');
    path.original = `general.${path.original}`;
  }

  // Get our section reference descriptor.
  const name = (aliases[leaf.context] ? aliases[leaf.context].name : leaf.context) || 'general';
  const type = (aliases[leaf.context] ? aliases[leaf.context].type : PageType.SETTINGS) || PageType.SETTINGS;

  // Ensure the model object reference exists.
  const template: ITemplate = {
    sortable: false,
    name,
    type,
    options: {},
    fields: {},
  };
  const sectionKey = Template.identifier(template);
  data[sectionKey] = data[sectionKey] || template;

  // Ensure the field descriptor exists. Merge settings if already exists.
  const old: IField | null = data[sectionKey].fields[leaf.key] || null;
  data[sectionKey].fields[leaf.key] = {
    key: leaf.key,
    type: leaf.type || old?.type || 'text',
    priority: leaf.hash.priority || old?.priority || 0,
    label: leaf.hash.label || old?.label || '',
    options: {...(old?.options || {}), ...leaf.hash },
  }

  return data;
}
