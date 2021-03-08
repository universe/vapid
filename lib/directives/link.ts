import { BaseDirective } from './base';
import { unfurl } from 'unfurl.js';

interface ILinkValue {
  id: string,
  url: string,
  name: string,
  page: number,
}

const cache = new Map();

export default class LinkDirective extends BaseDirective<ILinkValue | null> {

  options = {
    default: null,
    label: '',
    help: '',
    priority: 0,
    unfurl: false,
    format: 'url',
  }

  attrs = {
    placeholder: '',
    required: false,
  }

  /* eslint-disable class-methods-use-this */
  /**
   * Renders an HTML url input
   *
   * @param {string} name
   * @param {string} [value=this.options.default]
   * @return rendered input
   */
  input(name: string, value: ILinkValue | null = null) {
    let namePlaceholder = value?.url || '';
    let selectedPage = null;
    const options = this.meta.pages.reduce((memo, p) => {
      const selected = value?.page === p.id ? 'selected' : '';
      const option = `<option value="${p.id}" ${selected}>${p.name()}</option>`;
      if (selected) {
        selectedPage = p;
        namePlaceholder = p.name();
      }
      return memo + option;
    }, '');

    return `
      <fieldset class="fieldset" id="${name}">
        <label for="${name}[name]">Text</label>
        <small class="help">Human readable link text</small>
        <input type="text" id="${name}[name]" name="${name}[name]" value="${value?.name || ''}" placeholder="${namePlaceholder}">

        <label for="${name}[url]">Link</label>
        <small class="help">The Page or URL to link to</small>
        <select name="${name}[page]" id="${name}[page]" class="${selectedPage ? 'selected' : ''}">
          <option value="">Select a Page</option>
          ${options}
        </select>
        <span>or</span>
        <input type="url" name="${name}[url]" value="${value?.url}" placeholder="Enter a URL">
      </fieldset>
    `;
  }

  /**
   * The raw value.
   * Typically, directives escape the value.
   *
   * @param {string} [value=this.options.default]
   * @return {string}
   */
  preview(value: ILinkValue | null = this.options.default) {
    return value?.url || '';
  }
  /* eslint-enable class-methods-use-this */

  /**
   * Renders the link, or optionally an oEmbed
   */
  async render(value: ILinkValue | null = this.options.default) {

    const page = value?.page ? this.meta.pages.find(p => p.id === value.page) : null;
    const unfurled = (this.options.unfurl && value?.url) ? await unfurl(value?.url) : null;

    let str = value?.url || page?.permalink() || '';
    if (value?.url && this.options.unfurl) {
       str = await _oembed(value.url);
    }

    return {
      id: value?.id,
      url: value?.url || page?.permalink(),
      name: value?.name || page?.name() || value?.url,
      page: value?.page,
      description: unfurled?.description,
      title: unfurled?.title,
      favicon: unfurled?.favicon,
      keywords: unfurled?.keywords,
      oEmbed: unfurled?.oEmbed,
      twitter_card: unfurled?.twitter_card,
      open_graph: unfurled?.open_graph,
      toString() { return str; }
    };
  }
}

/**
 * @private
 *
 * Attempt to get the oEmbed info for a given link
 * Falls back to an <a> tag if that's not possible.
 *
 * @param {string} value
 * @return {string}
 */
async function _oembed(value: string): Promise<string> {
  let result = cache.get(value);

  if (result) {
    return result;
  }

  try {
    const unfurled = await unfurl(value);
    result = unfurled.twitter_card;
  } catch (err) {
    result = `<a href="${value}">${value}</a>`;
  }

  cache.set(value, result);
  return result;
}
