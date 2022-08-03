import { ASTv1,preprocess } from '@glimmer/syntax';
import { DirectiveMeta, HelperType,IField, ITemplate, PageType, ParsedExpr, stampTemplate, Template } from '@neutrino/core';
import { GlimmerTemplate, HelperResolver, IParsedTemplate, ITemplateAst,parsedTemplateToAst } from '@neutrino/runtime';
import pino from 'pino';

export type ComponentResolver = (name: string) => string | null;

const logger = pino();

const PAGE_META_KEYWORD = 'meta';

function isComponent(tag: string) {
  return tag[0] === tag[0].toUpperCase() || !!~tag.indexOf('-');
}

/* eslint-enable no-param-reassign */
function parseHash(pairs: (ASTv1.HashPair | ASTv1.AttrNode)[]): Record<string, any> {
  const out = {};
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
  let hash: Record<string, any> | null;

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
      if (node.params.length) {
        const tmp = parseExpression(node.params[0]);
        path = tmp[1];
        hash = tmp[0]?.hash || {};
      }
 else {
        path = node.path;
        hash = parseHash(node.hash.pairs);
      }
      break;
    default: {
      return [ null, null ];
    }
  }

  const context = (path as ASTv1.PathExpression)?.original.indexOf('this') === 0 ? 'this' : '';
  const key = (path as ASTv1.PathExpression).parts?.length === 1 
    ? (path as ASTv1.PathExpression).parts[0] 
    : (path as ASTv1.PathExpression).parts.slice(1).join('.');

  // TODO: Handle literal values
  return [{
    type: hash?.type,
    original: (path as ASTv1.PathExpression)?.original || '',
    key,
    context: (path as ASTv1.PathExpression)?.parts?.length === 1 ? context : (path as ASTv1.PathExpression)?.parts?.[0],
    path: (path as ASTv1.PathExpression)?.original || '',
    parts: (path as ASTv1.PathExpression)?.parts,
    hash,
    isPrivate: !!(path as ASTv1.PathExpression)?.data,
  }, (path as ASTv1.PathExpression) ];
}

function ensureBranch(data: Record<string, ITemplate>, node: ASTv1.BlockStatement, aliases: Record<string, IAlias>) {
  const [expr] = parseExpression(node);
  const [localExpr] = parseExpression(node.params[1]);

  if (localExpr && localExpr?.context !== 'this') {
    /* eslint-disable-next-line max-len */
    throw new Error(`Collection settings must be set on the page's "this" context. Instead found: {{${localExpr.original}}} at ${node.loc.asString()}:${node.loc.startPosition.line}:${node.loc.startPosition.column}`);
  }

  // If this is not an expression we care about, move on.
  if (!expr) { return; }

  // If this block is referencing a data property, don't add it to our data model.
  if (node.params.length && ((node.params[0] as ASTv1.PathExpression).data || expr.isPrivate)) { return; }

  // Record the type of this section appropriately
  const name = expr.context || expr.key;
  const newBranch: ITemplate = stampTemplate({
    name,
    type: PageType.COLLECTION,
    options: expr.hash,
    sortable: !!expr.hash.sortable,
    fields: {},
    metadata: {},
  });
  const branchId = Template.id(newBranch);
  const branch = data[branchId] = data[branchId] || newBranch;
  branch.options = { ...branch.options, ...newBranch.options };
  for (const field of Object.values(newBranch.fields)) {
    if (!field) { continue; }
    const prev = branch[field.key];
    if (field === prev) { continue; }

    branch.fields[field.key] = {
      key: field.key,
      templateId: null,
      type: (prev.type === 'text' ? field.type : (field.type === 'text' ? prev.type : field.type)) || 'text',
      options: { ...prev.options, ...field.options },
      priority: Math.min(prev.priority || Infinity, field.priority || Infinity),
      label: field.label,
    };
  }

  const page: ITemplate = stampTemplate({ name, type: PageType.PAGE });
  data[Template.id(page)] = data[Template.id(page)] || page;
  console.log('COLLECTION', localExpr?.key, branchId);
  data[Template.id(stampTemplate(aliases['this']))]['fields'][localExpr?.key || branchId] = {
    key: localExpr?.key || branchId,
    type: 'collection',
    priority: Infinity,
    label: '',
    templateId: branchId,
    options: {},
  };
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
function addToTree(data: Record<string, ITemplate>, leaf: ParsedExpr, path: ASTv1.PathExpression | ASTv1.Literal, aliases: Record<string, IAlias>) {
  if (!leaf) { return data; }
  const key = leaf.path.split('.').length >= 3 ? leaf.parts[0] : leaf.key;
  const context = (leaf.context === PAGE_META_KEYWORD && leaf.isPrivate) || leaf.path.startsWith('this.') ? 'this' : leaf.context;
  const contentLocation = leaf.context === PAGE_META_KEYWORD ? 'metadata' : 'fields';

  // If this is a private path, no-op.
  if (leaf.context !== PAGE_META_KEYWORD && leaf.isPrivate) { return data; }

  // If this is a private section, no-op.
  const isPrivateSection = aliases[context] ? aliases[context].isPrivate : false;
  if (isPrivateSection) { return data; }

  // If this is a private key, no-op.
  const isPrivateKey = (!context && aliases[key]) ? aliases[key].isPrivate : false;
  if (isPrivateKey) { return data; }

  // Log a warning if we're referencing the default general context without an explicit reference.
  // Update the original path node so we can actually render the template.
  if (!context && !leaf.isPrivate && !aliases[key]) {
    /* eslint-disable-next-line max-len */
    throw new Error(`Values referenced in a template must include a path context. Instead found: {{${leaf.original}}} at ${path.loc.asString()}:${path.loc.startPosition.line}:${path.loc.startPosition.column}`);
  }

  // Get our section reference descriptor.
  const name = (aliases[context] ? aliases[context].name : context) || 'general';
  const type = (aliases[context] ? aliases[context].type : PageType.SETTINGS) || PageType.SETTINGS;

  // Ensure the model object reference exists.
  const template: ITemplate = stampTemplate({ name, type });
  const sectionKey = Template.id(template);
  data[sectionKey] = data[sectionKey] || template;

  // Ensure the field descriptor exists. Merge settings if already exists.
  const old: IField | null = data[sectionKey][contentLocation][key] || null;
  const priority = parseInt(leaf.hash.priority, 10) ?? Infinity;
  if (priority <= 0) {
    /* eslint-disable-next-line max-len */
    throw new Error(`Priority value must be a positive integer. Instead found: {{${leaf.original}}} at ${path.loc.module}:${path.loc.startPosition.line}:${path.loc.startPosition.column}`);
  }
  leaf.hash.type = leaf.hash.type || 'text'; // Text is the default type.
  data[sectionKey][contentLocation][key] = {
    key,
    templateId: null,
    type: (leaf.hash.type === 'text' ? (old?.type || leaf.hash.type) : (leaf.hash.type || old?.type)) || 'text',
    priority: Math.min(leaf.hash.priority ?? Infinity, old?.priority ?? Infinity),
    label: leaf.hash.label || old?.label || '',
    options: { ...(old?.options || {}), ...leaf.hash },
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
      leaf && path && addToTree(template.templates, leaf, path, aliases);
      break;
    }

    case 'MustacheStatement':
    case 'SubExpression': {
      // If this mustache has params, it must be a helper.
      // Crawl all its params as potential data values.
      if (node.params && node.params.length) {
        for (const param of node.params) {
          walk(template, param, aliases, resolveComponent, helpers);
        }

      // Otherwise, this is a plain data value reference. Add it to the current object.
      }
 else {
        const [ leaf, path ] = parseExpression(node);
        leaf && path && addToTree(template.templates, leaf, path, aliases);
      }
      break;
    }

    case 'BlockStatement': {
      // All Block statements are helpers. Grab the helper we're evaluating.
      const helperName = (node.path as ASTv1.PathExpression).original;
      const HelperConstructor = helpers(helperName);
      const helper = HelperConstructor ? new HelperConstructor(helperName, node.hash, {} as unknown as DirectiveMeta) : null;
      // Crawl all its params as potential data values in scope.
      if (node.params.length && helper?.type !== HelperType.COLLECTION) {
        for (const param of node.params) {
          walk(template, param, aliases, resolveComponent, helpers);
        }
      }

      // If this helper denotes the creation of a field, add it to the current model.
      if (helper?.type === HelperType.VALUE) {
        const [ leaf, path ] = parseExpression(node);
        if (leaf && path) {
          leaf.hash.type = helperName || leaf.type;
          addToTree(template.templates, leaf, path, aliases);
        }
      }

      // If this helper denotes the creation of a new model type, ensure the model.
      if (helper?.type === HelperType.COLLECTION) {
        ensureBranch(template.templates, node, aliases);
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
              logger.error(node);
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
        else if (!param.startsWith('@')) {
          aliases[param] = {
            name: param,
            type: PageType.SETTINGS,
            isPrivate: true,
          };
        }
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

/**
 * Parses the HTML, and creates a template tree
 *
 * @return {Object} - a representation of the content
 */
 export function parse(
  name: string, 
  type: PageType, 
  html: string, 
  resolveComponent: ComponentResolver, 
  helpers: HelperResolver, 
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

  // Normalize field priority orders.
  for (const template of Object.values(templates)) {
    let maxPriority = 0;
    for (const field of Object.values(template.fields)) {
      if (!field) { continue; }
      if (field.priority !== Infinity) { maxPriority = Math.max(maxPriority, field.priority); }
    }
    maxPriority++;
    for (const field of Object.values(template.fields)) {
      if (!field) { continue; }
      if (field.priority === Infinity) { field.priority = maxPriority++; }
    }
  }

  return parsedTemplate;
}
