import { DirectiveProps, NeutrinoHelperOptions, ValueHelper } from '@neutrino/core';
import normalizeUrl from 'normalize-url';
import { JSX } from 'preact';
import { useId } from 'preact/hooks';

interface ILinkMetadata {
  title: string;
  description: string;
  images: string[];
  favicon: string;
  duration: number;
  domain: string;
  url: string;
}

interface ILinkValue {
  url: string | null;
  recordId: string | null;
  name: string | null;
  domain: string | null;
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
  keywords: string[] | null;
}

const cache = new Map();

const timeouts: Record<string, NodeJS.Timeout> = {};

export default class LinkHelper extends ValueHelper<ILinkValue> {

  default = {
    url: null,
    recordId: null,
    name: null,
    domain: null,
    title: null,
    description: null,
    favicon: null,
    image: null,
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
  input({ name, value = this.default, directive }: DirectiveProps<ILinkValue, this>) {
    const id = useId();
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

    return <fieldset className="fieldset" id={name} aria-describedby={`help-${name}`}>
      <label htmlFor={`${name}[name]`}>Text</label>
      <small className="help">Human readable link text</small>
      <input type="text" id={`${name}[name]`} name={`${name}[name]`} value={`${value?.name || ''}`} placeholder={namePlaceholder} onChange={(evt => {
        value.name = (evt.target as HTMLInputElement).value || null;
        directive.update(value);
      })} />

      <label htmlFor={`${name}[url]`}>Link</label>
      <small className="help">The Page or URL to link to</small>
      <select name={`${name}[page]`} id={`${name}[page]`} className={`${selectedPage ? 'selected' : ''}`} onChange={(evt => {
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
        let unfurled: Partial<ILinkMetadata> | null = null;
        const url = (evt.target as HTMLInputElement).value || null;

        try {
          // Clean up our URL and ensure it starts with https.
          const extract = normalizeUrl(url?.trim() || '');

          // This line will throw if it is an invalid URL.
          const urlObj = extract ? new URL(extract) : null;
          const host = `${urlObj?.origin || ''}${urlObj?.pathname || ''}`;

          if (cache.has(host)) {
            unfurled = cache.get(host);
          }
          else {
            // Throttle calls to run on 1s of inactivity so we don't overwhelm our link extract API.
            if (timeouts[id]) { clearTimeout(timeouts[id]); }
            timeouts[id] = setTimeout(() => {
              delete timeouts[id];
              // TODO: Self-host unfurl.js for link metadata?
              window.fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(host)}`).then((res) => {
                return res.json();
              }).then((unfurled: ILinkMetadata | { error: string }) => {
                if ('error' in unfurled) { return; }
                cache.set(host, unfurled);

                // If the current value of our input does not equal the value at the time of 
                // invocation, then the input has changed since we called our link extract API.
                const current = (evt.target as HTMLInputElement).value || null;
                if (current !== url) { return; }

                // Update our directive with the latest and greatest.
                directive.update({
                  url,
                  recordId: null,
                  domain: unfurled?.domain || null,
                  name: value?.name || null,
                  title: unfurled?.title || null,
                  description: unfurled?.description || null,
                  favicon: unfurled?.favicon || null,
                  image: unfurled?.images?.[0] || null,
                  keywords: [],
                });
              });
            }, 1000);
          }
        }
        catch (err) { console.error(`Error requesting website metadata for ${url}`, err); }

        directive.update({
          url,
          recordId: null,
          name: value?.name || null,
          domain: unfurled?.domain || null,
          description: unfurled?.description || null,
          title: unfurled?.title || null,
          image: unfurled?.images?.[0] || null,
          favicon: unfurled?.favicon || null,
          keywords: [],
        });
      }} />
    </fieldset>;
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
  async data(value: ILinkValue | null = this.default) {
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

  render([link]: [ILinkValue], _hash = {}, options: NeutrinoHelperOptions) {
    if (!link || !link.url || !link.name) { return options.inverse ? options.inverse() : ''; }
    return (link ? options.block?.([link]) : `${link}`) || '';
  }
}
