import { ASTv1,preprocess } from '@glimmer/syntax';
import { DirectiveMeta, HelperType,IField, ITemplate, NeutrinoValue, PageType, ParsedExpr, stampTemplate, Template } from '@neutrino/core';
import { GlimmerTemplate, HelperResolver, IParsedTemplate, ITemplateAst,parsedTemplateToAst } from '@neutrino/runtime';
import pino from 'pino';

export type ComponentResolver = (name: string) => string | null;

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

const PAGE_META_KEYWORD = 'meta';

function isComponent(tag: string) {
  return tag[0] === tag[0].toUpperCase() || !!~tag.indexOf('-');
}

/* eslint-enable no-param-reassign */
function parseHash(pairs: (ASTv1.HashPair | ASTv1.AttrNode)[]): Record<string, NeutrinoValue> {
  const out: Record<string, string> = {};
  for (const pair of pairs || []) {
    const key = (pair as ASTv1.HashPair).key || (pair as ASTv1.AttrNode).name;
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
  | ASTv1.Expression,
  ): [ParsedExpr | null, ASTv1.PathExpression | ASTv1.Literal | null] {
  let path;
  let hash: Record<string, NeutrinoValue> | null;

  switch (node?.type) {
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
      path = node.path;
      hash = parseHash(node.hash.pairs);
      break;
    default: {
      return [ null, null ];
    }
  }

  const context = (path as ASTv1.PathExpression)?.original.indexOf('this') === 0 ? 'this' : '';
  const key = (path as ASTv1.PathExpression).parts.length === 1 
    ? (path as ASTv1.PathExpression).parts[0] 
    : (path as ASTv1.PathExpression).parts.slice(1).join('.');

  // TODO: Handle literal values
  return [{
    type: typeof hash?.type === 'string' ? hash?.type : '',
    original: (path as ASTv1.PathExpression)?.original || '',
    key,
    context: (path as ASTv1.PathExpression)?.parts?.length === 1 ? context : (path as ASTv1.PathExpression)?.parts?.[0],
    path: (path as ASTv1.PathExpression)?.original || '',
    parts: (path as ASTv1.PathExpression)?.parts,
    hash,
    isPrivate: !!(path as ASTv1.PathExpression)?.data,
  }, (path as ASTv1.PathExpression) ];
}

function ensureBranch(template: IParsedTemplate, collectionExpr: ParsedExpr) {
  const data = template.templates;

  // We can discover collections names in two different formats:
  // 1. {{@collection.value}}
  // 2. {{@collection}}
  // Regardless of how it arrives, discover the name appropriately.
  // TODO: This is convoluted. Theres probably a way to simplify.
  let name = '';
  if (collectionExpr.context === 'collection') {
    name = collectionExpr.key;
  }
  else if (collectionExpr.key === 'collection' && !collectionExpr.context) {
    name = template.name;
  }

  if (!name) { return; }

  const newBranch: ITemplate = stampTemplate({
    name,
    type: PageType.COLLECTION,
    options: collectionExpr.hash,
    sortable: !!collectionExpr.hash.sortable,
    fields: {},
    metadata: {},
  });
  const branchId = Template.id(newBranch);
  const branch = data[branchId] = data[branchId] || newBranch;
  branch.options = { ...branch.options, ...newBranch.options };
  for (const field of Object.values(newBranch.fields)) {
    if (!field) { continue; }
    // TODO: ... is this right?
    const prev = branch?.[field.key as keyof ITemplate] as unknown as IField;
    if (field === prev) { continue; }

    branch.fields[field.key] = {
      key: field.key,
      templateId: null,
      type: (prev.type === 'text' ? field.type : (field.type === 'text' ? prev.type : field.type)) || 'text',
      options: { ...prev.options, ...field.options },
      priority: Math.min(prev.priority ?? Infinity, field.priority ?? Infinity),
      label: field.label,
    };
  }

  // Ensure that every collection has a parent "page" template, even if it's empty.
  const page: ITemplate = stampTemplate({ name, type: PageType.PAGE });
  data[Template.id(page)] = data[Template.id(page)] || page;
}

interface IAlias {
  name: string;
  type: PageType;
  isPrivate: boolean;
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
function addToTree(template: IParsedTemplate, leaf: ParsedExpr, path: ASTv1.PathExpression | ASTv1.Literal, aliases: Record<string, IAlias>, collectionId?: string) {
  if (!leaf) { return; }

  const data: Record<string, ITemplate> = template.templates;
  const context = (leaf.context === PAGE_META_KEYWORD && leaf.isPrivate) || leaf.path.startsWith('this.') ? 'this' : leaf.context;
  const key = context === 'this' && !(leaf.context === PAGE_META_KEYWORD && leaf.isPrivate) ? leaf.parts[0] : (leaf.parts[1] || leaf.parts[0]);
  const contentLocation = leaf.context === PAGE_META_KEYWORD ? 'metadata' : 'fields';

  // If this leaf node is a collection reference, make sure that colleciton exists!
  if (leaf.original.startsWith('@collection')) { ensureBranch(template, leaf); }

  // If this is a private path, no-op.
  if (leaf.context !== PAGE_META_KEYWORD && leaf.isPrivate) { return; }

  // If this is a private section, no-op.
  const isPrivateSection = aliases[context] ? aliases[context].isPrivate : false;
  if (isPrivateSection) { return; }

  // If this is a private key, no-op.
  const isPrivateKey = (!context && aliases[key]) ? aliases[key].isPrivate : false;
  if (isPrivateKey) { return; }

  // Log a warning if we're referencing the default general context without an explicit reference.
  if (!context && !leaf.isPrivate && !aliases[key]) {
    /* eslint-disable-next-line max-len */
    throw new Error(`Values referenced in a template must include a path context. Instead found: {{${leaf.original}}} at ${path.loc.asString()}:${path.loc.startPosition.line}:${path.loc.startPosition.column}`);
  }

  // Get our section reference descriptor.
  const name = (aliases[context] ? aliases[context].name : context) || 'general';
  const type = (aliases[context] ? aliases[context].type : PageType.SETTINGS) || PageType.SETTINGS;

  // Ensure the model object reference exists.
  const tmpl: ITemplate = stampTemplate({ name, type });
  const sectionKey = Template.id(tmpl);

  data[sectionKey] = data[sectionKey] || tmpl;

  // Ensure the field descriptor exists. Merge settings if already exists.
  const old: IField | null = data[sectionKey][contentLocation][key] || null;

  // Correct for some weird behavior by Handlebars.
  if (Object.hasOwnProperty.call(leaf.hash, 'priority') && leaf.hash.priority === undefined) {
    leaf.hash.priority = '0';
  }

  let priority = parseInt(`${leaf.hash.priority}`, 10) ?? Infinity;
  if (isNaN(priority)) { priority = Infinity; }

  if (Object.hasOwnProperty.call(leaf.hash, 'priority') && (priority < 0 || isNaN(priority))) {
    /* eslint-disable-next-line max-len */
    throw new Error(`Priority value must be a positive integer. Instead found: {{${leaf.original} priority=${leaf.hash.priority}}} at ${path.loc.module}:${path.loc.startPosition.line}:${path.loc.startPosition.column}`);
  }

  // Fetch our datum's directive type (if any) and fall back to plaintext.
  let directive: string = leaf.hash.type = typeof leaf.hash.type === 'string' ? leaf.hash.type : 'text';
  const newLabel: string = typeof leaf.hash.label === 'string' ? leaf.hash.label : '';

  // If our directive is an `@collection.<name>` statement, we're dealing with a collection helper.
  if (collectionId) { directive = 'collection'; }

  // If don't have a custom type value, keep the old definitions value if it's distinct, or default to text.
  directive = (directive === 'text' ? (old?.type || directive) : (directive || old?.type)) || 'text';
  // Save our fieldset configuration.
  const templateId = collectionId?.split?.('.')?.[1] || null;
  data[sectionKey][contentLocation][key] = {
    key,
    type: directive,
    priority: Math.min(priority ?? Infinity, old?.priority ?? Infinity),
    label: newLabel || old?.label || '',
    templateId: old?.templateId || templateId,
    options: {
      ...(old?.options || {}),
      ...leaf.hash,
      type: directive,
      templateId: old?.options?.templateId || templateId,
    },
  };

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
function walk(
  template: IParsedTemplate,
  node: ASTv1.Node , 
  aliases: Record<string, IAlias> = {}, 
  resolveComponent: ComponentResolver, 
  helpers: HelperResolver,
) {

  // Create a new copy of local aliases lookup object each time we enter a new block.
  aliases = Object.create(aliases);
  switch (node?.type) {
    case 'Template':
    case 'Block':
      node.body.forEach((n) => {
        walk(template, n, aliases, resolveComponent, helpers);
      });
      break;

    case 'ElementNode':
      if(isComponent(node.tag)) {
        const tmpl = resolveComponent(node.tag);
        if (!tmpl) {
          throw new Error(`Can not find component <${node.tag} />`);
        }
        template.components[node.tag] = template.components[node.tag] || parsedTemplateToAst(parse(
          aliases.this.name,
          aliases.this.type,
          tmpl,
          resolveComponent,
          helpers,
          template.templates,
          template.components,
        ));
      }
      if (node.tag.toLowerCase() === 'link') {
        for (const attr of node.attributes) {
          if (attr.name === 'href' && attr.value.type === 'TextNode' && attr.value.chars.startsWith('/')) {
            template.stylesheets[attr.value.chars] = {
              id: attr.value.chars,
              path: attr.value.chars,
              content: '',
            };
          }
        }
      }
      node.children.forEach((n) => {
        walk(template, n, aliases, resolveComponent, helpers);
      });
      node.attributes.forEach((n) => {
        walk(template, n.value, aliases, resolveComponent, helpers);
      });
      break;

    case 'ConcatStatement': {
      node.parts.forEach(n => {
        walk(template, n, aliases, resolveComponent, helpers);
      });
      break;
    }

    // case 'DecoratorBlock': throw new Error('Vapid does not support Decorators.');
    // case 'Decorator': throw new Error('Vapid does not support Decorators.');

    case 'PathExpression': {
      const [ leaf, path ] = parseExpression(node);
      leaf && path && addToTree(template, leaf, path, aliases);
      break;
    }

    case 'MustacheStatement':
    case 'SubExpression': {
      const [ leaf, path ] = parseExpression(node);
      const isCollection = leaf && (leaf?.isPrivate && (leaf.context === 'collection' || (leaf.key === 'collection' && !leaf.context)));

      // If this mustache has params, it must be a helper.
      // Crawl all its params as potential data values.
      if (node.params && node.params.length) {

        // If this helper is a collection,
        if (isCollection) {
          // Add our collection reference. This ensure the branch exists.
          leaf && path && addToTree(template, leaf, path, aliases);

          // If there is a pram passed to the `@collection` reference, add it as a collection field to the current model.
          const [ childLeaf, childPath ] = parseExpression(node.params[0]);
          childLeaf && childPath && addToTree(template, childLeaf, childPath, aliases, leaf.original);
        }

        else {
          // Ensure we get all child params.
          for (const param of node.params) {
            walk(template, param, aliases, resolveComponent, helpers);
          }
        }

      // Otherwise, this is a plain data value reference. Add it to the current object.
      }
      else {
        leaf && path && addToTree(template, leaf, path, aliases);
      }
      break;
    }

    case 'BlockStatement': {
      // All Block statements are helpers. Grab the helper we're evaluating.
      const helperName = (node.path as ASTv1.PathExpression).original;
      const HelperConstructor = helpers(helperName);
      const helper = HelperConstructor ? new HelperConstructor(helperName, node.hash, {} as unknown as DirectiveMeta) : null;
      const [expr] = parseExpression(node.params[0]);

      // If the first expression is `@collection.name`, or simply `@collection`, then we're dealing with a collection value!
      const isCollection = expr && (expr?.isPrivate && (expr.context === 'collection' || (expr.key === 'collection' && !expr.context)));
      const collectionName = isCollection ? (!expr.context ? template.name : expr.key) : null;

      // Crawl all its params as potential data values in scope.
      for (const param of (node.params || [])) {
        walk(template, param, aliases, resolveComponent, helpers);
      }

      // If this helper denotes the creation of a field, add it to the current model.
      if (helper?.type === HelperType.VALUE) {
        const [ leaf, path ] = parseExpression(node);
        if (leaf && path) {
          leaf.hash.type = helperName || leaf.type;
          addToTree(template, leaf, path, aliases);
        }
      }

      // Assign any yielded block params to the aliases object.
      const blockParams = node.program.blockParams = node.program.blockParams || [];
      for (let idx = 0; idx < blockParams.length; idx += 1) {
        const param = blockParams[idx];
        const path = (node.path as ASTv1.PathExpression);

        // Throw if the block param contains invalid characters.
        if (param.startsWith('@') || param.startsWith('_')) {
          /* eslint-disable-next-line max-len */
          throw new Error(`Unexpected value for block param. Names can not begin with '@' or '_'. Instead found: {{${path?.original} | ${param} |}} at ${path.loc.module}:${path.loc.startPosition.line}:${path.loc.startPosition.column}`);
        }

        aliases[param] = {
          name: (collectionName && idx === 0) ? collectionName : param,
          type: (isCollection && idx === 0) ? PageType.COLLECTION : PageType.SETTINGS,
          isPrivate: !(isCollection && idx === 0),
        };
      }

      if (node.program) walk(template, node.program, aliases, resolveComponent, helpers);
      if (node.inverse) walk(template, node.inverse, aliases, resolveComponent, helpers);
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

  return template;
}

const NOOP_FUNCTION = () => null;

/**
 * Parses the HTML, and creates a template tree
 *
 * @return {Object} - a representation of the content
 */
 export function parse(
  name: string, 
  type: PageType, 
  html: string, 
  resolveComponent: ComponentResolver = NOOP_FUNCTION,
  helpers: HelperResolver = NOOP_FUNCTION,
  templates: Record<string, ITemplate> = {}, 
  components: Record<string, ITemplateAst> = {},
): IParsedTemplate {
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
    templates[Template.id(template)] = templates[Template.id(template)] || template;
  }

  // Ensure all collections have a corresponding page template, even if empty.
  if (type === PageType.COLLECTION) {
    const page: ITemplate = stampTemplate({ name, type: PageType.PAGE });
    templates[Template.id(page)] = templates[Template.id(page)] || page;
  }

  const parsedTemplate: IParsedTemplate = { name, type, ast, templates, components, stylesheets: {} };

  // Recursively walk our AST.
  walk(parsedTemplate, ast, {
    '': { name: 'general', type: PageType.SETTINGS, isPrivate: false },
    this: { name, type, isPrivate: false },
  }, resolveComponent, helpers);

  return parsedTemplate;
}
