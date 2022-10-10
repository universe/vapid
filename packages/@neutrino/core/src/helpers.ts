import type { SimpleDocumentFragment } from '@simple-dom/interface';
import { Json } from '@universe/util';
import type { ComponentChildren } from 'preact';

import { IField,SerializedRecord } from './types.js';

/**
 * Directive Options Base Interface
 */
 export interface DirectiveOptions {
  type: string;
  label: string;
  help: string;
  priority: number;
  required: boolean;
}

export enum HelperType {
  COLLECTION = 'COLLECTION',
  VALUE = 'VALUE',
  HELPER = 'HELPER',
}

export class SafeString {
  private str: string;
  constructor(str: string) {
    this.str = str;
  }
  toString(): string {
    return `${  this.str}`;
  }
}

export interface ParsedExpr {
  original: string;
  key: string;
  context: string;
  path: string;
  parts: string[];
  hash: Record<string, any>;
  isPrivate: boolean;
  type: string;
}

export type BlockRenderer = Json | { toString: () => string; };
export type SimpleNeutrinoValue = string | boolean | number | SafeString | SimpleDocumentFragment;
export type RuntimeHelper = () => SimpleNeutrinoValue;
export type NeutrinoValue = SimpleNeutrinoValue | RuntimeHelper | null;

/**
 * Attempts to cast value to the correct type
 */
function coerceType(val: any): string | number | boolean | null {
  try { return JSON.parse(val); }
 catch (err) { return val; }
}

export interface NeutrinoHelperOptions {
  fragment?: SimpleDocumentFragment;
  block?: (blockParams?: any[], data?: Record<string, any>) => SimpleDocumentFragment;
  inverse?: (blockParams?: any[], data?: Record<string, any>) => SimpleDocumentFragment;
}

export interface DirectiveMeta {
  records: SerializedRecord[];
  record: SerializedRecord | null;
  media: string;
  templateId: string | null;
}

export type DirectiveField = Partial<IField>;
export type DirectiveCallback<DirectiveType> = (key: string, value: DirectiveType) => void | Promise<void>;
export interface DirectiveProps<DirectiveType, T extends BaseHelper<any> = BaseHelper<any>> {
  name: string;
  value?: DirectiveType | undefined;
  directive: T;
}

export interface IMedia { file: { src: string } }
export type FileHandler = (id: string, b64Image: string | Blob, type: string) => Promise<IMedia | null>;

/**
 * The base class that all directives inherit from.
 * These are the crux of Vapid, allowing templates to specify input attributes and render content.
 */
/* eslint-disable @typescript-eslint/ban-types */
export abstract class BaseHelper<DirectiveType, Options = object> {

  abstract default: DirectiveType;
  #onChange: DirectiveCallback<DirectiveType>;
  key: string;

  meta: DirectiveMeta = {
    records: [],
    record: null,
    media: '',
    templateId: null,
  };

  options: DirectiveOptions & Options = {
    type: 'text',
    label: '',
    help: '',
    priority: 0,
    required: false,
  } as DirectiveOptions & Options;

  constructor(key: string, field: DirectiveField, meta: DirectiveMeta) {
    this.key = key;
    this.meta = { ...this.meta, ...meta };
    const options = field?.options || {};
    this.#onChange = ((_name: string, _value: DirectiveType) => void 0);
    // Separate options and attributes, discarding ones that aren't explicity specified
    for (const [ key, value ] of Object.entries(options)) {
      this.options[key] = coerceType(value);
    }
  }

  private static fileHandlers: FileHandler[] = [];
  static async registerFileHandler(handler: FileHandler) { BaseHelper.fileHandlers = [handler]; }
  static async emitFile(id: string, b64Image: string | Blob, type = 'image/png') {
    for (const handler of BaseHelper.fileHandlers) { const res = await handler(id, b64Image, type); if (res) { return res; }}
    return { file: { src: '' } };
  }

  /**
   * Editor methods for input, update, and onChange.
   */
  public input(_props: DirectiveProps<DirectiveType>): ComponentChildren | false { return false; }
  protected update(value: DirectiveType) { this.#onChange(this.key, value); }
  public onChange(callback: DirectiveCallback<DirectiveType>): void { this.#onChange = callback || ((_name: string, _value: DirectiveType) => void 0); }

  /**
   * Display methods for data, previews, and page renders.
   */
  public async data(value?: DirectiveType | undefined): Promise<BlockRenderer> { return `${value || this.default}`; }
  public preview(value?: DirectiveType | undefined): ComponentChildren { return `${value || this.default}`; }
  public render(_params: any[], _hash: DirectiveOptions & Options, _options: NeutrinoHelperOptions): NeutrinoValue { return ''; }
  public inject(): BlockRenderer { return ''; }
}

/* eslint-disable @typescript-eslint/ban-types */
export abstract class Helper<Options = object> extends BaseHelper<null, Options> {
  readonly type = HelperType.HELPER;
  default = null;
}

/* eslint-disable @typescript-eslint/ban-types */
export abstract class ValueHelper<DirectiveType, Options = object> extends BaseHelper<DirectiveType, Options> {
  readonly type = HelperType.VALUE;
}

/* eslint-disable @typescript-eslint/ban-types */
export abstract class CollectionHelper<DirectiveType, Options = object> extends BaseHelper<DirectiveType, Options> {
  readonly type = HelperType.COLLECTION;
}

export function appendFragment(root: SimpleDocumentFragment, fragment: SimpleDocumentFragment | undefined) {
  if (!fragment) { return; }
  let head = fragment.firstChild;
  while (head) {
    const el = head;
    head = head.nextSibling;
    root.appendChild(el);
  }
}