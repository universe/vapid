import type { SimpleDocumentFragment } from '@simple-dom/interface';
import { Json } from '@universe/util';
import type { ComponentChildren } from 'preact';

import { IField, IWebsiteMeta, SerializedRecord } from './types.js';

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

export type BlockRenderer = Json | { toString: () => string; };
export type SimpleNeutrinoValue = string | boolean | number | null | SafeString | SimpleDocumentFragment;
export type DataNeutrinoValue = object | Json | Json[];
export type POJONeutrinoValue = string | boolean | number | null | DataNeutrinoValue;
export type RuntimeHelper = () => SimpleNeutrinoValue;
export type NeutrinoValue = SimpleNeutrinoValue | RuntimeHelper | DataNeutrinoValue;

export interface ParsedExpr {
  original: string;
  key: string;
  context: string;
  path: string;
  parts: string[];
  hash: Record<string, POJONeutrinoValue>;
  isPrivate: boolean;
  type: string;
}

/**
 * Attempts to cast value to the correct type
 */
function coerceType(val: string | number | boolean): string | number | boolean | null {
  try { return JSON.parse(val as string); }
  catch (err) { return val; }
}

export interface NeutrinoHelperOptions {
  fragment?: SimpleDocumentFragment;
  block?: (blockParams?: NeutrinoValue[], data?: Record<string, NeutrinoValue>) => SimpleDocumentFragment;
  inverse?: (blockParams?: NeutrinoValue[], data?: Record<string, NeutrinoValue>) => SimpleDocumentFragment;
}

export interface DirectiveMeta {
  templateId: string | null;
  media: string;
  website: IWebsiteMeta;
  records: SerializedRecord[];
  record: SerializedRecord | null;
}

export type DirectiveField = Partial<IField>;
export type DirectiveCallback<DirectiveType> = (key: string, value: DirectiveType) => void | Promise<void>;
export interface DirectiveProps<DirectiveType, T extends BaseHelper<unknown> = BaseHelper<unknown>> {
  name: string;
  value?: DirectiveType | undefined;
  directive: T;
}

export type UploadResult = { status: 'pending'; progress: number; } 
  | { status: 'paused'; progress: number; } 
  | { status: 'success'; url: string; } 
  | { status: 'error'; message: string; };

export type UploadFileFunction = {
  (file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  (file: File, name?: string): AsyncIterableIterator<UploadResult>;
}

/**
 * The base class that all directives inherit from.
 * These are the crux of Vapid, allowing templates to specify input attributes and render content.
 */
/* eslint-disable @typescript-eslint/ban-types */
export abstract class BaseHelper<DirectiveType, Options extends object = object> {
  abstract default: DirectiveType;
  #onChange: DirectiveCallback<DirectiveType>;
  key: string;

  meta: DirectiveMeta = {
    records: [],
    record: null,
    website: {
      name: '',
      domain: '',
      media: '',
      theme: {
        name: 'neutrino',
        version: 'latest',
      },
      env: {},
    },
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
    const options: Partial<DirectiveOptions> = field?.options as unknown as DirectiveOptions || {};
    this.#onChange = ((_name: string, _value: DirectiveType) => void 0);
    // Separate options and attributes, discarding ones that aren't explicity specified
    for (const [ key, value ] of Object.entries(options)) {
      (this.options as {[key: string]: unknown})[key] = coerceType(value);
    }
    this.options.type = field?.type || options.type || this.options.type;
    this.input = this.input.bind(this);
  }

  private static fileHandlers: UploadFileFunction[] = [];
  static async registerFileHandler(handler: UploadFileFunction) { BaseHelper.fileHandlers = [handler]; }

  static emitFile(file: string, type: string, name: string): AsyncIterableIterator<UploadResult>;
  static emitFile(file: File, name?: string): AsyncIterableIterator<UploadResult>;
  static emitFile(file: File | string, type?: string, name?: string): AsyncIterableIterator<UploadResult> {
    for (const handler of BaseHelper.fileHandlers) {
      return handler(file as string, type as string, name as string);
    }
    throw new Error('No file handler provided.');
    // return { async next() { return { status: 'error', message: 'No file handler provided.' }; } }
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
  public render(_params: NeutrinoValue[], _hash: DirectiveOptions & Options, _options: NeutrinoHelperOptions): NeutrinoValue { return ''; }
  public inject(): BlockRenderer { return ''; }
}

/* eslint-disable @typescript-eslint/ban-types */
export abstract class Helper<Options extends object = object> extends BaseHelper<null, Options> {
  readonly type = HelperType.HELPER;
  default = null;
}

/* eslint-disable @typescript-eslint/ban-types */
export abstract class ValueHelper<DirectiveType, Options extends object = object> extends BaseHelper<DirectiveType, Options> {
  readonly type = HelperType.VALUE;
}

/* eslint-disable @typescript-eslint/ban-types */
export abstract class CollectionHelper<DirectiveType, Options extends object = object> extends BaseHelper<DirectiveType, Options> {
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