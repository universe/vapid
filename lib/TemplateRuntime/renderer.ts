import type { ASTv1 } from '@glimmer/syntax';
import type { InsertPosition, NodeType, SimpleText, SimpleDocument, SimpleDocumentFragment, SimpleElement, SimpleNode, } from '@simple-dom/interface';

import { GlimmerTemplate, SafeString, RendererComponentResolver } from './types';
import { NeutrinoHelperOptions, HelperResolver, NeutrinoValue } from './helpers/types';
import { uuid } from '@universe/util';

type SimpleParent = SimpleElement | SimpleDocument | SimpleDocumentFragment;

interface VapidRuntimeEnv {
  isDevelopment: boolean;
  document: SimpleDocument,
  root: SimpleParent,
  program: GlimmerTemplate | ASTv1.Block | ASTv1.Template | ASTv1.Program | ASTv1.Statement[],
  contents: ASTv1.Statement[],
  resolveComponent: RendererComponentResolver,
  resolveHelper: HelperResolver,
}

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
  return hash.default ?? context.path.original.includes('.') ? `{{${context.path.original}}}` : '';
}

function appendFragment(root: SimpleParent, fragment: SimpleParent | undefined) {
  if (!fragment) { return; }
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

function isScriptNode(node: SimpleParent): node is SimpleElement {
  return node.nodeType === 1 as NodeType.ELEMENT_NODE && node.tagName === 'SCRIPT';
}

function isDocumentFragment(node: NeutrinoValue): node is SimpleDocumentFragment {
  return !!node && typeof (node as SimpleDocumentFragment)?.appendChild === 'function';
}

function resolveValue(node: ASTv1.MustacheStatement | ASTv1.BlockStatement | ASTv1.Expression, ctx: Record<string, any>, data: Record<string, any>, resolveHelper: HelperResolver, options?: NeutrinoHelperOptions): NeutrinoValue {
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
        obj = obj?.[part] ?? null;
      }
      if (typeof obj === 'function') { obj = obj(); }
      if (obj instanceof SafeString) { return obj; }
      return obj;
  }
  switch(node.path.type) {
    case 'PathExpression':
      // If is helper
      if (node.path.parts.length === 1 && !node.path.this && !node.path.data && resolveHelper(node.path.parts[0])) {
        const helper = resolveHelper(node.path.parts[0]);
        const params = node.params.map(param => resolveValue(param, ctx, data, resolveHelper));
        const hash = {};
        for (const pair of node.hash.pairs) {
          hash[pair.key] = resolveValue(pair.value, ctx, data, resolveHelper);
        }
        return (helper && helper.run(params, hash, options || {})) ?? null;
      }
      else {
        return resolveValue(node.path, ctx, data, resolveHelper);
      }
    default:
      return resolveValue(node.path, ctx, data, resolveHelper);
  }
}

type DebugContainerType = 'attribute' | 'content';
let UNIQUE_ID = 0;
function applyDebugAttrExpr(type: DebugContainerType, el: SimpleElement, expr: ASTv1.Expression) {
  if (expr.type === 'SubExpression') { applyDebugAttr(type, el, expr) }
  if (expr.type === 'PathExpression') {
    el.setAttribute(`data-neutrino-${expr.original.replace('@', 'at-').replace('.', '-')}`, type);
    el.setAttribute('data-neutrino', type);
    el.setAttribute('data-neutrino-id', `${UNIQUE_ID++}`);
  }
}

function applyDebugAttr(type: DebugContainerType, el: SimpleElement, statement: ASTv1.MustacheStatement | ASTv1.SubExpression | ASTv1.BlockStatement) {
  applyDebugAttrExpr(type, el, statement.path);
  for (const param of statement.params) {
    applyDebugAttrExpr(type, el, param);
  }
}

function traverse(
  env: VapidRuntimeEnv,
  context = {},
  data = {},
) {
const { document, root, program, resolveComponent, resolveHelper } = env;
  if (!program) { return; }
  const statements: ASTv1.Statement[] = Array.isArray(program) ? program : program.body;

  for (const node of statements) {
    switch(node.type) {
      case 'ElementNode':
        if (isComponent(node.tag)) {
          const ast = resolveComponent(node.tag);
          const fragment = document.createDocumentFragment();
          const subData = { ...data };
          for (const attr of node.attributes) {
            if (!attr.name.startsWith('@')) { continue; }
            const input = attr.value;
            const key = attr.name.slice(1);
            let value: NeutrinoValue = null;
            switch (input.type) {
              case 'TextNode':
                value = input.chars;
              break;
              case 'ConcatStatement':
                value = '';
                for (const statement of input.parts) {
                  switch(statement.type) {
                    case 'TextNode': value += statement.chars; break;
                    case 'MustacheStatement':
                      value += resolveValue(statement, context, data, resolveHelper) ?? missingData(statement);
                      break;
                  }
                }
                break;
              default:
                value = resolveValue(input, context, data, resolveHelper) ?? missingData(input) ?? '';
            }
            subData[key] = value;
          }
          subData['component'] = { id: uuid() };
          const childEnv = { ...env, root: fragment, program: ast, contents: node.children };
          traverse(childEnv, context, subData);
          appendFragment(root, fragment);
        }
        else {
          let el = document.createElement(node.tag);
          const childEnv: VapidRuntimeEnv = { ...env, root: el, program: node.children };
          traverse(childEnv, context, data);
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
                    case 'MustacheStatement':
                      value += resolveValue(statement, context, data, resolveHelper) ?? missingData(statement);
                      if (env.isDevelopment) {
                        applyDebugAttr('attribute', el, statement);
                      }
                      break;
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
        if (isScriptNode(root)) {
          if (!root.firstChild) { root.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, ' '); }
            const text = root.firstChild as SimpleText;
            text.nodeValue += node.chars;
        }
        else {
          root.appendChild(document.createTextNode(node.chars));
        }
        break;
      case 'MustacheStatement': {
        if (isYield(node)) {
          const slot = document.createDocumentFragment();
          const childEnv: VapidRuntimeEnv = { ...env, program: env.contents, root: slot, contents: [] }
          traverse(childEnv, context, data);
          appendFragment(root, slot);
          break;
        }

        const val = resolveValue(node, context, data, resolveHelper) ?? missingData(node) ?? '';
        let parent = root;
        if (env.isDevelopment && val.toString() && !isScriptNode(parent)) {
          const el = document.createElement('span');
          applyDebugAttr('content', el, node);
          root.appendChild(el);
          parent = el;
        }
        if (val instanceof SafeString) {
          // Because document fragments don't have insertAdjacentHTML.
          const tmp = document.createElement('template');
          tmp.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, val.toString());
          appendFragment(parent, tmp);
        }
        else {
          if (isScriptNode(parent)) {
            if (!parent.firstChild) { parent.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, ' '); }
            const text = parent.firstChild as SimpleText;
            text.nodeValue += val.toString();
          }
          else {
            isDocumentFragment(val) ? appendFragment(parent, val) : parent.appendChild(document.createTextNode(String(val ?? '')));
          }
        }
        break;
      }
      case 'BlockStatement': {
        const val = resolveValue(node, context, data, resolveHelper, {
          fragment: document.createDocumentFragment(),
          block: (blockParams: any[] = [], dat: Record<string, any> = {}) => {
            const fragment = document.createDocumentFragment();
            if (!node.program) { return fragment; }
            const subEnv: VapidRuntimeEnv = { ...env, program: node.program, root: fragment, contents: [] };
            const subCtx = { ...context };
            const subData = { ...data, ...dat };
            for (let paramIdx = 0; paramIdx < node.program.blockParams.length; paramIdx++) {
              subCtx[node.program.blockParams[paramIdx]] = blockParams[paramIdx];
            }
            traverse(subEnv, subCtx, subData);
            return fragment;
          },
          inverse: (blockParams: any[] = [], dat: Record<string, any> = {}) => {
            const fragment = document.createDocumentFragment();
            if (!node.inverse) { return fragment; }
            const subEnv: VapidRuntimeEnv = { ...env, program: node.inverse, root: fragment, contents: [] };
            const subCtx = { ...context };
            const subData = { ...data, ...dat };
            for (let paramIdx = 0; paramIdx < node.program.blockParams.length; paramIdx++) {
              subCtx[node.program.blockParams[paramIdx]] = blockParams[paramIdx];
            }
            node.inverse && traverse(subEnv, subCtx, subData);
            return fragment;
          },
        });

        let parent = root;
        if (env.isDevelopment && val?.toString()) {
          const el = document.createElement('span');
          applyDebugAttr('content', el, node);
          root.appendChild(el);
          parent = el;
        }

        // Append our new content.
        if (val === undefined) { throw new Error(`Unknown helper {{${(node.path as ASTv1.PathExpression).original}}}`) }
        else if (val instanceof SafeString) {
          // Because document fragments don't have insertAdjacentHTML.
          const tmp = document.createElement('template');
          tmp.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, val.toString());
          appendFragment(parent, tmp);
        }
        else if (isDocumentFragment(val)) { appendFragment(parent, val); }
        else { parent.appendChild(document.createTextNode(String(val ?? ''))); }

        break;
      }
      case 'PartialStatement':
        throw new Error('Vapid does not support Handlebars partials.');
      case 'CommentStatement':
        root.appendChild(document.createComment(node.value)); break;
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
export function render(document: SimpleDocument, ast: GlimmerTemplate, resolveComponent: RendererComponentResolver, resolveHelper: HelperResolver, context = {}, data = {}) {
  const env: VapidRuntimeEnv = {
    isDevelopment: false,
    document,
    root: document.createDocumentFragment(),
    program: ast,
    contents: [],
    resolveComponent,
    resolveHelper,
  };
  traverse(env, context, data);
  let el: SimpleNode | null = env.root.firstChild;
  do {
    for (const el of Array.from(document.childNodes)) document.removeChild(el);
    // Only one element node is allowed to be appended to the document.
    if (el?.nodeType === 1 as NodeType.ELEMENT_NODE) {
      document.appendChild(el);
      break;
    }
  } while (el = el?.nextSibling || null)
}
