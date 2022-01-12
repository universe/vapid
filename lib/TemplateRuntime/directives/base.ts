import type { ComponentChildren } from 'preact';
import type { Json } from '@universe/util';
import type { IField, SerializedRecord,  } from '../../Database/types';
import type { IMedia } from '../../TemplateRuntime';

/**
 * Directive Options Base Interface
 */
export interface DirectiveOptions {
  type: string;
  label: string;
  help: string;
  priority: number;
  required: boolean,
}

export type BlockRenderer = Json | { toString: () => string; };

/**
 * Attempts to cast value to the correct type
 */
function coerceType(val: any): string | number | boolean | null {
  try { return JSON.parse(val); } catch (err) { return val; }
}

export interface DirectiveMeta {
  records: SerializedRecord[];
  record: SerializedRecord | null;
  media: IMedia;
}

export type DirectiveField = Partial<IField>;
export type DirectiveCallback<DirectiveType> = (key: string, value: DirectiveType) => void | Promise<void>;
export interface DirectiveProps<DirectiveType, T extends BaseDirective<any> = BaseDirective<any>> {
  name: string;
  value: DirectiveType;
  directive: T;
}

/**
 * The base class that all directives inherit from.
 * These are the crux of Vapid, allowing templates to specify input attributes and render content.
 */
export abstract class BaseDirective<DirectiveType, Options = {}> {

  abstract default: DirectiveType;
  #onChange: DirectiveCallback<DirectiveType>;
  key: string;

  meta: DirectiveMeta = {
    records: [],
    record: null,
    media: {
      host: '',
    },
  };

  options: DirectiveOptions & Partial<Options> = {
    type: 'text',
    label: '',
    help: '',
    priority: 0,
    required: false,
  } as DirectiveOptions & Partial<Options>;

  constructor(key: string, params: DirectiveField, meta: DirectiveMeta) {
    this.key = key;
    this.meta = { ...this.meta, ...meta };
    const options = params?.options || {};
    this.#onChange = ((_name: string, _value: DirectiveType) => void 0);
    // Separate options and attributes, discarding ones that aren't explicity specified
    for (const [key, value] of Object.entries(options)) {
      this.options[key] = coerceType(value);
    }
  }


  /**
   * Editor methods for input and change.
   */
  abstract input(props: DirectiveProps<DirectiveType>): ComponentChildren;
  protected update(value: DirectiveType) { this.#onChange(this.key, value); }

  /**
   * Display methods for previews, data saving, and page renders.
   */
  public preview(value: DirectiveType | undefined): ComponentChildren { return `${value || this.default}`; }
  public serialize(value = this.default): DirectiveType { return value; }
  public async render(value: DirectiveType = this.default): Promise<string | BlockRenderer> { return `${value || this.default}`; }
  public onChange(callback: DirectiveCallback<DirectiveType>): void { this.#onChange = callback || ((_name: string, _value: DirectiveType) => void 0); }
}
