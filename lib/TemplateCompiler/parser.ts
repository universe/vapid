import merge from 'lodash.merge';
import { preprocess, ASTv1 } from '@glimmer/syntax';
import pino from 'pino';

import { Template, ITemplate, PageType, IField, stampTemplate } from '../Database/models/Template';

import { ParsedExpr, NeutrinoHelper } from './helpers';
import { ComponentResolver, IParsedTemplate, GlimmerTemplate, HelperResolver } from './types';

const logger = pino();

function isComponent(tag: string) {
  return tag[0] === tag[0].toUpperCase() || !!~tag.indexOf('-');
}

/* eslint-enable no-param-reassign */
function parseHash(pairs: (ASTv1.HashPair | ASTv1.AttrNode)[]): Record<string, any> {
  const out = {};
  for (const pair of pairs || []) {
    const key = (pair as ASTv1.HashPair).key || (pair as ASTv1.AttrNode).name
    out[key] = (pair.value as ASTv1.PathExpression).original || (pair.value as ASTv1.TextNode).chars;
  }
  return out;
}

/* eslint-disable prefer-destructuring */
function parseExpression(node:
    ASTv1.MustacheStatement
  | ASTv1.PathExpression
  | ASTv1.BlockStatement
  | ASTv1.MustacheStatement
  | ASTv1.SubExpression
  | ASTv1.Expression
  ): [ParsedExpr | null, ASTv1.PathExpression | ASTv1.Literal | null] {
  let path;
  let hash: Record<string, any> | null;

  switch (node.type) {
    case 'PathExpression':
      path = node;
      hash = {};
      break;
    case 'BlockStatement':
      path = parseExpression(node.params[0])[1];
      hash = parseHash(node.hash.pairs);
      break;
    case 'MustacheStatement':
    case 'SubExpression':
      if (node.params.length) {
        const tmp = parseExpression(node.params[0]);
        path = tmp[1];
        hash = tmp[0]?.hash || {};
      } else {
        path = node.path;
        hash = parseHash(node.hash.pairs);
      }
      break;
    default: {
      return [null, null];
    }
  }

  const context = (path as ASTv1.PathExpression)?.original.indexOf('this') === 0 ? 'this' : '';
  const key = (path as ASTv1.PathExpression).parts?.length === 1 ? (path as ASTv1.PathExpression).parts[0] : (path as ASTv1.PathExpression).parts.slice(1).join('.');

  // TODO: Handle literal values
  return [{
    type: hash.type,
    original: (path as ASTv1.PathExpression)?.original || '',
    key,
    context: (path as ASTv1.PathExpression)?.parts?.length === 1 ? context : (path as ASTv1.PathExpression)?.parts?.[0],
    path: (path as ASTv1.PathExpression)?.original || '',
    parts: (path as ASTv1.PathExpression)?.parts,
    hash,
    isPrivate: !!(path as ASTv1.PathExpression)?.data,
  }, (path as ASTv1.PathExpression)];
}


function ensureBranch(data: Record<string, ITemplate>, node: ASTv1.BlockStatement, helper: NeutrinoHelper) {
  const [expr] = parseExpression(node);

  // If this is not an expression we care about, move on.
  if (!expr) { return; }

  // If this block is referencing a data property, don't add it to our data model.
  if (node.params.length && ((node.params[0] as ASTv1.PathExpression).data || expr.isPrivate)) { return; }

  // Record the type of this section appropriately
  const name = expr.context || expr.key;
  const newBranch: ITemplate = stampTemplate({
    name,
    type: helper.isBranch || PageType.PAGE,
    options: expr.hash,
    sortable: !!expr.hash.sortable,
    fields: {},
  });
  const branch = data[Template.identifier(newBranch)] = data[Template.identifier(newBranch)] || newBranch;
  merge(branch.options, newBranch.options);
  merge(branch.fields, newBranch.fields);
}

interface IAlias {
  name: string;
  type: PageType;
  isPrivate: boolean;
};

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
function addToTree(data: Record<string, ITemplate>, leaf: ParsedExpr, path: ASTv1.PathExpression | ASTv1.Literal, aliases: Record<string, IAlias>) {
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
  if (!leaf.context && !leaf.isPrivate) {
    throw new Error(`Values in template must have a context. Instead found: {{${leaf.original}}} at ${path.loc.module}:${path.loc.startPosition.line}:${path.loc.startPosition.column}`);
  }

  // Get our section reference descriptor.
  const name = (aliases[leaf.context] ? aliases[leaf.context].name : leaf.context) || 'general';
  const type = (aliases[leaf.context] ? aliases[leaf.context].type : PageType.SETTINGS) || PageType.SETTINGS;

  // Ensure the model object reference exists.
  const template: ITemplate = stampTemplate({ name, type });
  const sectionKey = Template.identifier(template);
  data[sectionKey] = data[sectionKey] || template;

  // Ensure the field descriptor exists. Merge settings if already exists.
  const old: IField | null = data[sectionKey].fields[leaf.key] || null;
  data[sectionKey].fields[leaf.key] = {
    key: leaf.key,
    type: (leaf.hash.type === 'text' ? (old?.type || leaf.hash.type) : (leaf.hash.type || old?.type)) || 'text',
    priority: Math.max(leaf.hash.priority || 0, old?.priority || 0),
    label: leaf.hash.label || old?.label || '',
    options: {...(old?.options || {}), ...leaf.hash },
  }

  return data;
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
function walk(data: Record<string, ITemplate>, node: ASTv1.Node , aliases: Record<string, IAlias> = {}, resolveComponent: ComponentResolver, helpers: HelperResolver) {

  // Create a new copy of local aliases lookup object each time we enter a new block.
  aliases = Object.create(aliases);
  switch (node.type) {
    case 'Template':
    case 'Block':
      node.body.forEach((n) => {
        walk(data, n, aliases, resolveComponent, helpers);
      });
      break;

    case 'ElementNode':
      if(isComponent(node.tag)) {
        const tmpl = resolveComponent(node.tag);
        if (!tmpl) {
          throw new Error(`Can not find component <${node.tag} />`);
        }
        parse(
          aliases.this.name,
          aliases.this.type,
          tmpl,
          resolveComponent,
          helpers,
          data,
          aliases,
        ).ast;
      }
      node.children.forEach((n) => {
        walk(data, n, aliases, resolveComponent, helpers);
      });
      node.attributes.forEach((n) => {
        walk(data, n.value, aliases, resolveComponent, helpers);
      });
      break;

    case 'ConcatStatement': {
      node.parts.forEach(n => {
        walk(data, n, aliases, resolveComponent, helpers);
      });
      break;
    }

    // case 'DecoratorBlock': throw new Error('Vapid does not support Decorators.');
    // case 'Decorator': throw new Error('Vapid does not support Decorators.');

    case 'PathExpression': {
      const [leaf, path] = parseExpression(node);
      leaf && path && addToTree(data, leaf, path, aliases);
      break;
    }

    case 'MustacheStatement':
    case 'SubExpression': {
      // If this mustache has params, it must be a helper.
      // Crawl all its params as potential data values.
      if (node.params && node.params.length) {
        for (const param of node.params) {
          walk(data, param, aliases, resolveComponent, helpers);
        }

      // Otherwise, this is a plain data value reference. Add it to the current object.
      } else {
        const [leaf, path] = parseExpression(node);
        leaf && path && addToTree(data, leaf, path, aliases);
      }
      break;
    }

    case 'BlockStatement': {
      // All Block statements are helpers. Grab the helper we're evaluating.
      const helper = helpers((node.path as ASTv1.PathExpression).original);

      // Crawl all its params as potential data values in scope.
      if (node.params.length && !helper?.isBranch) {
        for (const param of node.params) {
          walk(data, param, aliases, resolveComponent, helpers);
        }
      }

      // If this helper denotes the creation of a field, add it to the current model.
      if (helper?.isField) {
        const [leaf, path] = parseExpression(node);
        if (leaf && path) {
          leaf.hash.type = helper.getType ? (helper.getType(leaf) || leaf.type) : leaf.type;
          addToTree(data, leaf, path, aliases);
        }
      }

      // If this helper denotes the creation of a new model type, ensure the model.
      if (helper?.isBranch) {
        ensureBranch(data, node, helper);
      }

      // Assign any yielded block params to the aliases object.
      node.program.blockParams = node.program.blockParams || [];
      for (let idx = 0; idx < node.program.blockParams.length; idx += 1) {
        const param = node.program.blockParams[idx];
        const path = (node.path as ASTv1.PathExpression);
        if (path.parts[0] === 'collection') {
          const arg = node.params[0];
          let name = '';
          switch (arg.type) {
            case 'BooleanLiteral':
            case 'NullLiteral':
            case 'NumberLiteral':
            case 'StringLiteral':
            case 'UndefinedLiteral':
              name = `${arg.value}`; break;
            case 'PathExpression':
              name = arg.original; break;
            case 'SubExpression':
            default:
              logger.error(node)
              throw new Error(`Unexpected value for collection name.`);
          }

          if (name.startsWith('@') || name.startsWith('_')) {
            throw new Error(`Unexpected value for collection name. Collection names can not begin with '@' or '_'.`);
          }

          aliases[param] = {
            name,
            type: PageType.COLLECTION,
            isPrivate: !!path.data,
          };
        }
        else {
          aliases[param] = {
            name: param,
            type: PageType.SETTINGS,
            isPrivate: true,
          };
        }
      }

      if (node.program) walk(data, node.program, aliases, resolveComponent, helpers);
      if (node.inverse) walk(data, node.inverse, aliases, resolveComponent, helpers);
      break;
    }

    // Do nothing for literals and comments.
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'BooleanLiteral':
    case 'UndefinedLiteral':
    case 'NullLiteral':
    case 'TextNode':
    case 'CommentStatement':
    case 'MustacheCommentStatement':
      break;

    default: {
      logger.warn('Unknown Node', node);
      break;
    }
  }

  return data;
}



/**
 * Parses the HTML, and creates a template tree
 *
 * @return {Object} - a representation of the content
 */
 export function parse(name: string, type: PageType, html: string, resolveComponent: ComponentResolver, helpers: HelperResolver, data: Record<string, ITemplate> = {}, _aliases: Record<string, IAlias> = {}): IParsedTemplate {
  let ast: GlimmerTemplate;
  try { ast = preprocess(html); }
  catch (err) { throw new Error('Bad template syntax'); }

  if (type !== PageType.COMPONENT) {
    const template: ITemplate = stampTemplate({
      name,
      type,
      options: {},
      fields: {},
      sortable: false,
    });
    data[Template.identifier(template)] = data[Template.identifier(template)] || template;
  }

  walk(data, ast, {
    '': { name: 'general', type: PageType.SETTINGS, isPrivate: false },
    'this': { name, type, isPrivate: false },
  }, resolveComponent, helpers);

  return { name, type, data, ast };
}
