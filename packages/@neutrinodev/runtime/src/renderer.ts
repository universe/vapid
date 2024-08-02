import type { ASTv1 } from '@glimmer/syntax';
import { nanoid, NeutrinoHelperOptions, NeutrinoValue, SafeString } from '@neutrinodev/core';
import { InsertPosition, Namespace, NodeType, SimpleDocument, SimpleDocumentFragment, SimpleElement, SimpleText  } from '@simple-dom/interface';

import { HelperResolver } from './helpers.js';
import { GlimmerTemplate, IPageContext, IParsedTemplate, RendererComponentResolver } from './types.js';

type SimpleParent = SimpleElement | SimpleDocument | SimpleDocumentFragment;

interface VapidRuntimeEnv {
  isDevelopment: boolean;
  document: SimpleDocument,
  root: SimpleParent,
  program: GlimmerTemplate | ASTv1.Block | ASTv1.Template | ASTv1.Program | ASTv1.Statement[],
  contents: ASTv1.Statement[],
  namespace: Namespace.HTML | Namespace.SVG,
  resolveComponent: RendererComponentResolver,
  resolveHelper: HelperResolver,
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type UnknonwValueHash = Record<string, any>;

function isComponent(tag: string) {
  return tag[0] === tag[0].toUpperCase() || !!~tag.indexOf('-');
}

function parseHash(pairs: (ASTv1.HashPair | ASTv1.AttrNode)[]): UnknonwValueHash {
  const out: Record<string, string> = {};
  for (const pair of pairs || []) {
    const key = (pair as ASTv1.HashPair).key || (pair as ASTv1.AttrNode).name;
    out[key] = (pair.value as ASTv1.PathExpression).original || (pair.value as ASTv1.TextNode).chars;
  }
  return out;
}

function missingData(context: ASTv1.BlockStatement | ASTv1.SubExpression | ASTv1.MustacheStatement) {
  const hash = parseHash(context.hash.pairs);
  /* eslint-disable-next-line */
  // @ts-ignore
  return hash.default ?? context.path.original.includes('.') ? undefined : ''; // `{{${context.path.original}}}`
}

function appendFragment(root: SimpleParent, fragment: SimpleParent | undefined) {
  if (!fragment) { return; }
  let head = fragment.firstChild;
  while (head) {
    const el = head;
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

function isStyleNode(node: SimpleParent): node is SimpleElement {
  return node.nodeType === 1 as NodeType.ELEMENT_NODE && node.tagName === 'STYLE';
}

function isDocumentFragment(node: NeutrinoValue): node is SimpleDocumentFragment {
  return !!node && typeof (node as SimpleDocumentFragment)?.appendChild === 'function';
}

function resolveValue(
  node: ASTv1.MustacheStatement | ASTv1.BlockStatement | ASTv1.Expression, 
  ctx: UnknonwValueHash, 
  data: UnknonwValueHash, 
  resolveHelper: HelperResolver, 
  options?: NeutrinoHelperOptions,
): NeutrinoValue {
  switch(node.type) {
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'BooleanLiteral':
      return node.value;
    case 'UndefinedLiteral':
    case 'NullLiteral':
      return null;
    case 'PathExpression': {
      let obj = node.this ? ctx['this'] : (node.data ? data : ctx);
      for (const part of node.parts) {
        obj = obj?.[part] ?? null;
      }
      if (typeof obj === 'function') { obj = obj(); }
      if (obj instanceof SafeString) { return obj; }
      if (node.original.startsWith('@collection')) {
        return [...data.collection];
      }
      return obj;
    }
  }
  switch(node.path.type) {
    case 'PathExpression':
      // If is helper
      if (!node.path.this && (node.params?.length || node.hash?.pairs?.length)/* !node.path.data */) {
        const type = node.path.parts[0];
        const helper = resolveHelper(type);
        if (!helper) { return resolveValue(node.path, ctx, data, resolveHelper); }
        const params = node.params.map(param => resolveValue(param, ctx, data, resolveHelper));
        const hash: Record<string, NeutrinoValue> = {};
        for (const pair of node.hash.pairs) {
          hash[pair.key] = resolveValue(pair.value, ctx, data, resolveHelper);
        }

        // If this is a collection helper, and no param has been passed to allow the user to specify
        // which collection should be used, then use the default collection for this page.
        if (type === 'collection' && !params[0]) {
          params[0] = data.collection;
        }

        /* eslint-disable-next-line */
        /* @ts-ignore */
        return (helper && helper.prototype.render(params, hash, options || {})) ?? null;
      }

      return resolveValue(node.path, ctx, data, resolveHelper);

    default:
      return resolveValue(node.path, ctx, data, resolveHelper);
  }
}

type DebugContainerType = 'attribute' | 'content';
let UNIQUE_ID = 0;
function applyDebugAttrExpr(type: DebugContainerType, el: SimpleElement, expr: ASTv1.Expression) {
  if (expr.type === 'SubExpression') { applyDebugAttr(type, el, expr); }
  if (expr.type === 'PathExpression') {
    el.setAttribute(`data-neutrino-${expr?.original?.replaceAll('@', 'at-')?.replace('.', '-')}`, type);
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

function getAttributeValue(
  attr: ASTv1.MustacheStatement | ASTv1.TextNode | ASTv1.ConcatStatement,
  context: Record<string, NeutrinoValue>,
  data: IRenderPageContext,
  env: VapidRuntimeEnv,
  el?: SimpleElement,
) {
  switch(attr.type) {
    case 'TextNode':
      return attr.chars;
    case 'ConcatStatement': {
      let value = '';
      for (const statement of attr.parts) {
        switch(statement.type) {
          case 'TextNode': value += statement.chars; break;
          case 'MustacheStatement':
            value += resolveValue(statement, context, data, env.resolveHelper) ?? missingData(statement);
            if (el && env.isDevelopment) {
              applyDebugAttr('attribute', el, statement);
            }
            break;
        }
      }
      return value;
    }
    case 'MustacheStatement':
      return `${resolveValue(attr, context, data, env.resolveHelper) ?? missingData(attr)}`;
  }
}

function traverse(
  env: VapidRuntimeEnv,
  tmpl: IParsedTemplate,
  context: Record<string, NeutrinoValue>,
  data: IRenderPageContext,
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
          const subData: IRenderPageContext = {
            ...data,
            props: {},
            component: { id: nanoid() },
          };
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
            subData.props[key] = value;
          }
          const childEnv = { ...env, root: fragment, program: ast, contents: node.children };
          traverse(childEnv, tmpl, context, subData);
          appendFragment(root, fragment);
        }
        else {
          const childEnv: VapidRuntimeEnv = { ...env };
          if (node.tag === 'svg') { childEnv.namespace = Namespace.SVG; }
          const el = document.createElementNS(childEnv.namespace, node.tag);
          childEnv.root = el;
          childEnv.program = node.children;
          traverse(childEnv, tmpl, context, data);
          let url: string | null = null;
          if (node.tag.toLowerCase() === 'link') {
            for (const attr of node.attributes) {
              if (attr.name === 'href' && attr.value.type === 'TextNode') {
                url = attr.value.chars;
              }
            }
          }
          // TODO: Only inline our css in dev mode. For prod builds, upload stylesheets and reference a URL.
          if (url && tmpl.stylesheets[url]) {
            if (env.isDevelopment) {
              el.parentNode?.removeChild(el);
              const style = document.createElementNS(env.namespace, 'style');
              style.appendChild(document.createTextNode(tmpl.stylesheets[url].content));
              root?.appendChild(style);
            }
            else {
              el.setAttribute('rel', 'stylesheet');
              el.setAttribute('href', tmpl.stylesheets[url].path);
            }            
          }
          else {
            for (const attr of node.attributes) {
              const value = getAttributeValue(attr.value, context, data, env, el);
              el.setAttribute(attr.name, value);
            }
          }
          root.appendChild(el);
        }
        break;
      case 'TextNode':
        if (isScriptNode(root) || isStyleNode(root)) {
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
          const childEnv: VapidRuntimeEnv = { ...env, program: env.contents, root: slot, contents: [] };
          traverse(childEnv, tmpl, context, data);
          appendFragment(root, slot);
          break;
        }

        const val = resolveValue(node, context, data, resolveHelper) ?? missingData(node) ?? '';
        let parent = root;
        if (env.isDevelopment && val.toString() && !isScriptNode(parent) && !isStyleNode(parent)) {
          const el = document.createElementNS(env.namespace, 'span');
          applyDebugAttr('content', el, node);
          root.appendChild(el);
          parent = el;
        }
        if (val instanceof SafeString) {
          // Because document fragments don't have insertAdjacentHTML.
          const tmp = document.createElementNS(env.namespace, 'template');
          tmp.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, val.toString());
          appendFragment(parent, tmp);
        }
        else if (isScriptNode(parent) || isStyleNode(parent)) {
          if (!parent.firstChild) { parent.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, ' '); }
          const text = parent.firstChild as SimpleText;
          text.nodeValue += val.toString();
        }
        else {
          isDocumentFragment(val) ? appendFragment(parent, val) : parent.appendChild(document.createTextNode(String(val ?? '')));
        }
        break;
      }
      case 'BlockStatement': {
        const val = resolveValue(node, context, data, resolveHelper, {
          fragment: document.createDocumentFragment(),
          block: (blockParams: NeutrinoValue[] = [], dat: UnknonwValueHash = {}) => {
            const fragment = document.createDocumentFragment();
            if (!node.program) { return fragment; }
            const subEnv: VapidRuntimeEnv = { ...env, program: node.program, root: fragment, contents: [] };
            const subCtx = { ...context };
            const subData = { ...data, ...dat };
            for (let paramIdx = 0; paramIdx < node.program.blockParams.length; paramIdx++) {
              subCtx[node.program.blockParams[paramIdx]] = blockParams[paramIdx];
            }
            traverse(subEnv, tmpl, subCtx, subData);
            return fragment;
          },
          inverse: (blockParams: NeutrinoValue[] = [], dat: UnknonwValueHash = {}) => {
            const fragment = document.createDocumentFragment();
            if (!node.inverse) { return fragment; }
            const subEnv: VapidRuntimeEnv = { ...env, program: node.inverse, root: fragment, contents: [] };
            const subCtx = { ...context };
            const subData = { ...data, ...dat };
            for (let paramIdx = 0; paramIdx < node.program.blockParams.length; paramIdx++) {
              subCtx[node.program.blockParams[paramIdx]] = blockParams[paramIdx];
            }
            node.inverse && traverse(subEnv, tmpl, subCtx, subData);
            return fragment;
          },
        });

        const parent = root;
        // TODO: Re-enable?
        // if (env.isDevelopment && val?.toString()) {
        //   const el = document.createElementNS(env.namespace, 'span');
        //   applyDebugAttr('content', el, node);
        //   root.appendChild(el);
        //   parent = el;
        // }

        // Append our new content.
        if (val === undefined) { throw new Error(`Unknown helper {{${(node.path as ASTv1.PathExpression).original}}}`); }
        else if (val instanceof SafeString) {
          // Because document fragments don't have insertAdjacentHTML.
          const tmp = document.createElementNS(env.namespace, 'template');
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

export type IRenderValue = NeutrinoValue | ((params: [Record<string, NeutrinoValue>[]], hash: UnknonwValueHash) => Record<string, NeutrinoValue>[])
export type IRenderCollections = Record<string, Record<string, IRenderValue>[] | Record<string, IRenderValue>>;
export type IRenderPageContext = Omit<Omit<Omit<IPageContext, 'content'>, 'collection'>, 'meta'> & { 
  collection: IRenderCollections;
  meta: Record<string, NeutrinoValue>;
  props: Record<string, NeutrinoValue>;
  component: { id: string; };
};

/**
 * Applies content to the template
 *
 * @param {Object} content
 * @return {string} - HTML that has tags replaced with content
 */
export function render(
  document: Document | SimpleDocument, 
  tmpl: IParsedTemplate, 
  resolveComponent: RendererComponentResolver, 
  resolveHelper: HelperResolver, 
  data: IRenderPageContext, 
  context = {},
): SimpleDocumentFragment {
  // For Typescript
  document = document as SimpleDocument;
  UNIQUE_ID = 0; // Re-set our incrementing debug ID.
  const ast = tmpl.ast;
  const discoveredHelpers: Set<ReturnType<typeof resolveHelper>> = new Set();
  const env: VapidRuntimeEnv = {
    isDevelopment: data.env.isDev,
    document,
    root: document.createDocumentFragment(),
    namespace: Namespace.HTML,
    program: ast,
    contents: [],
    resolveComponent,
    resolveHelper: (key: string): ReturnType<typeof resolveHelper> => {
      const helper = resolveHelper(key);
      helper && discoveredHelpers.add(helper);
      return helper;
    },
  };
  traverse(env, tmpl, context, data);
  
  // Append development styles to the document tree if needed.
  if (env.isDevelopment) {
    const style = document.createElementNS(env.namespace, 'style');
    style.appendChild(document.createTextNode(`
      [data-neutrino="content"] { display: contents; }
      [data-neutrino="content"]:empty { height: 0; width: 100%; }
    `));
    // Typings are wonky, but this works.
    (env.root as unknown as HTMLElement)?.firstElementChild?.firstElementChild?.appendChild(style as unknown as HTMLStyleElement);
  }

  for (const field of Object.values(tmpl?.templates?.[`${tmpl.name}-${tmpl.type}`]?.fields || {})) {
    if (!field) { continue; }
    const helper = resolveHelper(field.type);
    helper && discoveredHelpers.add(helper);
  }

  // let el: SimpleNode | null = env.root.firstChild;
  // do {
  //   // Only one element node is allowed to be appended to the document.
  //   if (el?.nodeType === 1 as NodeType.ELEMENT_NODE) {
  //     for (const el of Array.from(document.childNodes)) { document.removeChild(el); }
  //     document.appendChild(el);
  //     break;
  //   }
  // } while (el = el?.nextSibling || null);

  // Inject any helper content to the head.
  for (const helper of discoveredHelpers) {
    const inject = helper?.prototype?.inject?.call(null);
    if (!inject) { continue; }
    if (inject instanceof SafeString) {
      // Because document fragments don't have insertAdjacentHTML.
      const tmp = document.createElementNS(Namespace.HTML, 'template');
      tmp.insertAdjacentHTML('beforeend' as InsertPosition.beforeend, inject.toString());
      appendFragment(document.head, tmp);
    }
    else {
      document.head.appendChild(document.createTextNode(inject.toString()));
    }
  }

  return env.root as SimpleDocumentFragment;
}
