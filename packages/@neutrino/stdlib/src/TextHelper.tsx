
import { DirectiveField, DirectiveMeta, DirectiveProps,ValueHelper } from '@neutrino/core';

const autoExpand = (el: HTMLTextAreaElement | null) => {
  if (!el) { return; }
  el.style.resize = 'none';
  el.style.height = 'inherit';
  el.style.height = `${el.scrollHeight}px`;
};

interface TextHelperOptions {
  maxlength: number;
  long: boolean;
  placeholder: string;
}

export default class TextHelper extends ValueHelper<string, TextHelperOptions> {
  default = '';

  constructor(key: string, params: DirectiveField, meta: DirectiveMeta) {
    super(key, params, meta);
    if (params.options?.default !== undefined && params.options?.default !== null) {
      this.default = String(params.options?.default);
    }
  }

  /**
   * Renders either a text or textarea input
   */
   input({ name, value, directive }: DirectiveProps<string, this>) {
    const attrs = { ...directive.options };
    if (value === directive.default) { value = ''; }
    attrs.placeholder = attrs.placeholder || directive.default;

    if (directive.options.long) {
      return <textarea
        {...attrs}
        name={name}
        aria-describedby={`help-${name}`}
        onInput={evt => { const el = evt.target as HTMLTextAreaElement; autoExpand(el); directive.update(el.value); }}
        ref={current => autoExpand(current)}
      >{value}</textarea>;
    }

    return <input
      {...attrs}
      type={name?.toLowerCase() === 'content[email]' ? 'email' : 'text'}
      name={name}
      aria-describedby={`help-${name}`}
      value={value}
      onInput={evt => directive.update((evt.target as HTMLInputElement).value)}
    />;
  }
}
