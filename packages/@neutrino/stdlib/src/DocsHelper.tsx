
import { DirectiveProps,ValueHelper } from '@neutrino/core';

interface DocsHelperOptions {
  title: string;
  text: string;
  cta: string;
  href: string;
}

export default class DocsHelper extends ValueHelper<string, DocsHelperOptions> {
  default = '';

  async data() { return ''; }
  render() { return ''; }

  /**
   * Renders either a text or textarea input
   */
   input({ directive }: DirectiveProps<string, this>) {
    return <fieldset>
      <h3 class="field__docs-title">{directive.options.title}</h3>
      <p class="field__docs-text">{directive.options.text}</p>
      <a class="field__docs-link" href={directive.options.href} target="_blank" rel="noreferrer">{directive.options.cta}</a>
    </fieldset>;
  }
}
