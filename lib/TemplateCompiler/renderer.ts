import { preprocess, ASTv1 } from '@glimmer/syntax';
import { Document } from 'simple-dom';
import { SimpleDocument, SimpleElement, SimpleDocumentFragment, NodeType, InsertPosition } from '@simple-dom/interface';
import Serializer from '@simple-dom/serializer';
import { PageType } from '../Database/models/Template';

import { NeutrinoHelperOptions, SafeString } from './helpers/types';
import { ComponentResolver, HelperMap } from './types';

export type GlimmerTemplate = ASTv1.Template;

type SimpleParent = SimpleElement | SimpleDocument | SimpleDocumentFragment;

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

function missingData(context: ASTv1.BlockStatement | ASTv1.SubExpression | ASTv1.MustacheStatement) {
  const hash = parseHash(context.hash.pairs);
  // @ts-ignore
  return hash.default || `{{${context.path.original}}}`;
}

function appendFragment(root: SimpleParent, fragment: SimpleParent) {
  let head = fragment.firstChild;
  while (head) {
    let el = head;
    head = head.nextSibling;
    root.appendChild(el);
  }
}

function isYield(node: ASTv1.MustacheStatement): boolean {
  return node.path.type === 'PathExpression' && node.path.parts[0] === 'yield' && node.path.data;
}

function resolveValue(node: ASTv1.MustacheStatement | ASTv1.BlockStatement | ASTv1.Expression, ctx: Record<string, any>, data: Record<string, any>, helpers: HelperMap, options?: NeutrinoHelperOptions): string | SafeString | SimpleDocumentFragment | null {
  switch(node.type) {
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'BooleanLiteral':
    case 'UndefinedLiteral':
    case 'NullLiteral':
      return `${node.value}`;
    case 'PathExpression':
      let obj = node.this ? ctx['this'] : (node.data ? data : ctx);
      for (const part of node.parts) {
        obj = obj?.[part] || null;
      }
      if (typeof obj === 'function') { obj = obj(); }
      if (obj instanceof SafeString) { return obj; }
      return obj === null ? null : `${obj}`;
  }
  switch(node.path.type) {
    case 'PathExpression':
      // If is helper
      if (node.path.parts.length === 1 && helpers[node.path.parts[0]]) {
        const helper = helpers[node.path.parts[0]];
        const params = node.params.map(param => resolveValue(param, ctx, data, helpers));
        const hash = {};
        for (const pair of node.hash.pairs) {
          hash[pair.key] = resolveValue(pair.value, ctx, data, helpers);
        }
        return (helper && helper.run(params, hash, options || {})) || null;
      }
      else {
        return resolveValue(node.path, ctx, data, helpers);
      }
    default:
      return resolveValue(node.path, ctx, data, helpers);
  }
}


function traverse(
  html: SimpleDocument,
  root: SimpleParent,
  block: ASTv1.Block | ASTv1.Template | ASTv1.Program | ASTv1.Statement[],
  resolveComponent: (name: string) => string,
  helpers: HelperMap,
  context = {},
  data = {},
  contents: ASTv1.Statement[] = [],
) {
  const statements: ASTv1.Statement[] = Array.isArray(block) ? block : block.body;

  for (const node of statements) {
    switch(node.type) {
      case 'ElementNode':
        if (isComponent(node.tag)) {
          const tmpl = resolveComponent(node.tag);
          const ast = preprocess(tmpl);
          const fragment = html.createDocumentFragment();
          traverse(html, fragment, ast, resolveComponent, helpers, context, data, node.children);
          appendFragment(root, fragment);
        }
        else {
          let el = html.createElement(node.tag);
          traverse(html, el, node.children, resolveComponent, helpers, context, data, contents);
          for (const attr of node.attributes) {
            switch(attr.value.type) {
              case 'TextNode':
                el.setAttribute(attr.name, attr.value.chars);
                break;
              case 'ConcatStatement':
                let value = '';
                for (const statement of attr.value.parts) {
                  switch(statement.type) {
                    case 'TextNode': value += statement.chars; break;
                    case 'MustacheStatement': value += resolveValue(statement, context, data, helpers) || missingData(statement); break;
                  }
                }
                el.setAttribute(attr.name, value);
                break;
              case 'MustacheStatement':
                el.setAttribute(attr.name, `{{expr}}`);
            }
          }
          root.appendChild(el);
        }
        break;
      case 'TextNode':
        if (root.nodeType === NodeType.ELEMENT_NODE && root.tagName === 'SCRIPT') {
          root.insertAdjacentHTML(InsertPosition.beforeend, node.chars);
        }
        else {
          root.appendChild(html.createTextNode(node.chars));
        }
        break;
      case 'MustacheStatement': {
        if (isYield(node)) {
          const slot = html.createDocumentFragment();
          traverse(html, slot, contents, resolveComponent, helpers, context, data, []);
          appendFragment(root, slot);
          break;
        }
        const val = resolveValue(node, context, data, helpers) || missingData(node) || '';
        if (val instanceof SafeString) {
          root.appendChild(html.createRawHTMLSection!(val.toString()));
        }
        else {
          typeof val === 'string' ? root.appendChild(html.createTextNode(val)) : appendFragment(root, val);
        }
        break;
      }
      case 'BlockStatement': {
        const val = resolveValue(node, context, data, helpers, {
          block: (blockParams: any[] = [], dat: Record<string, any> = {}) => {
            const subCtx = { ...context };
            const subData = { ...data, ...dat };
            for (let paramIdx = 0; paramIdx < node.program.blockParams.length; paramIdx++) {
              subCtx[node.program.blockParams[paramIdx]] = blockParams[paramIdx];
            }
            const fragment = html.createDocumentFragment();
            traverse(html, fragment, node.program, resolveComponent, helpers, subCtx, subData);
            return fragment;
          },
          inverse: (blockParams: any[] = [], dat: Record<string, any> = {}) => {
            const subCtx = { ...context };
            const subData = { ...data, ...dat };
            for (let paramIdx = 0; paramIdx < node.program.blockParams.length; paramIdx++) {
              subCtx[node.program.blockParams[paramIdx]] = blockParams[paramIdx];
            }
            const fragment = html.createDocumentFragment();
            node.inverse && traverse(html, fragment, node.inverse, resolveComponent, helpers, subCtx, subData);
            return fragment;
          },
        });
        if (!val) {
          throw new Error(`Unknown helper {{${(node.path as ASTv1.PathExpression).original}}}`)
        }

        if (val instanceof SafeString) {
          root.appendChild(html.createRawHTMLSection!(val.toString()));
        }
        else {
          typeof val === 'string' ? root.appendChild(html.createTextNode(val)) : appendFragment(root, val);
        }
        break;
      }
      case 'PartialStatement':
        throw new Error('Vapid does not support Handlebars partials.');
      case 'CommentStatement':
        root.appendChild(html.createComment(node.value)); break;
      case 'MustacheCommentStatement':
        break; // Exclude Mustache Comments
    }
  }
}


/**
 * Applies content to the template
 *
 * @param {Object} content
 * @return {string} - HTML that has tags replaced with content
 */
export function render(_name: string, _type: PageType, tmpl: GlimmerTemplate | string, resolveComponent: ComponentResolver, helpers: HelperMap, context = {}, data = {}) {
  const ast = typeof tmpl === 'string' ? preprocess(tmpl) : tmpl;
  const document = new Document();
  traverse(document, document, ast, resolveComponent, helpers, context, data, []);
  const serializer = new Serializer({});
  return serializer.serialize(document);
}
