import { JSX } from 'preact';
import { BaseDirective, DirectiveProps } from './base';
import type { Metadata } from 'unfurl.js/dist/types';

interface ILinkValue {
  url: string | null;
  name: string | null;
  recordId: string | null;
  description: string | null;
  title: string | null;
  favicon: string | null;
  keywords: string[] | null;
}

const cache = new Map();

export default class LinkDirective extends BaseDirective<ILinkValue> {

  default = {
    url: null,
    name: null,
    recordId: null,
    description: null,
    title: null,
    favicon: null,
    keywords: null,
  };

  /* eslint-disable class-methods-use-this */
  /**
   * Renders an HTML url input
   *
   * @param {string} name
   * @param {string} [value=this.options.default]
   * @return rendered input
   */
   input({ name, value, directive }: DirectiveProps<ILinkValue, this>) {
    value = JSON.parse(JSON.stringify(value));
    let namePlaceholder = value?.url || '';
    let selectedPage = null;
    const options: JSX.Element[] = directive.meta.records.reduce((memo: JSX.Element[], p) => {
      if (!p.permalink) { return memo; }
      const isSelected = value?.recordId === p.id;
      if (isSelected) {
        selectedPage = p;
        namePlaceholder = p.name;
      }
      memo.push(<option value={p.id} selected={isSelected}>{p.name}</option>);
      return memo;
    }, []);

    return <fieldset class="fieldset" id={name} aria-describedby={`help-${name}`}>
      <label for={`${name}[name]`}>Text</label>
      <small class="help">Human readable link text</small>
      <input type="text" id={`${name}[name]`} name={`${name}[name]`} value={`${value?.name || ''}`} placeholder={namePlaceholder} onChange={(evt => {
        value.name = (evt.target as HTMLInputElement).value || null;
        directive.update(value);
      })} />

      <label for={`${name}[url]`}>Link</label>
      <small class="help">The Page or URL to link to</small>
      <select name={`${name}[page]`} id={`${name}[page]`} class={`${selectedPage ? 'selected' : ''}`}  onChange={(evt => {
        const el = (evt.target as HTMLSelectElement);
        value.recordId = el.options[el.selectedIndex].value;
        value.url = null;
        directive.update(value);
      })}>
        <option value="">Select a Page</option>
        {options}
      </select>
      <span>or</span>
      <input type="url" name={`${name}[url]`} value={value?.url || ''} placeholder="Enter a URL" onChange={async (evt) => {
        let unfurled: Metadata | null = null;
        const url = (evt.target as HTMLInputElement).value || null;

        try {
          const host = url ? new URL(url).host : null;
          unfurled = host ? (cache.get(host) || await (await window.fetch(`/api/unfurl/${host}`)).json()) : null;
          if (unfurled) { cache.set(host, unfurled); }
        } catch (err) { console.error(`Error requesting website metadata for ${url}`, err); }

        directive.update({
          url: url,
          recordId: null,
          name: value?.name || null,
          description: unfurled?.description || null,
          title: unfurled?.title || null,
          favicon: unfurled?.favicon || null,
          keywords: unfurled?.keywords || [],
        });
      }} />
    </fieldset>
  }

  /**
   * The raw value.
   *
   * @param {string} [value=this.options.default]
   * @return {string}
   */
  preview(value: ILinkValue | null = this.default) { return value?.url || ''; }
  /* eslint-enable class-methods-use-this */

  /**
   * Renders the link, or optionally an oEmbed
   */
  async render(value: ILinkValue | null = this.default) {
    const page = value?.recordId ? this.meta.records.find(p => p.id === value.recordId) : null;
    return {
      toString() { return value?.url || page?.slug || ''; },
      url: value?.url || page?.slug,
      name: value?.name || page?.name || value?.url,
      description: value?.description || null,
      title: value?.title || null,
      favicon: value?.favicon || null,
      keywords: value?.keywords || [],
    };
  }
}
