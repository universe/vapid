import './index.css';

import { DirectiveProps, SafeString,ValueHelper } from '@neutrino/core';

import fonts from './fonts.js';

interface FontHelperOptions {
  default: string,
}

interface FontHelperValue {
  family: string;
}

export default class FontHelper extends ValueHelper<FontHelperValue, FontHelperOptions> {

  default = { family: '' };

  input({ name, value }: DirectiveProps<FontHelperValue>) {
    const family = value?.family || this.options.default || '';
    return <>
      <select name={name} onChange={(evt: Event) => this.update({ family: (evt.target as HTMLSelectElement).value || '' })}>
        <option value="" selected={!family}>Select a Font</option>
        {fonts.items.map(font => {
          return <option key={font.family} value={font.family} selected={font.family === family}>{font.family}</option>;
        })}
      </select>
    </>;
  }

  async data(value?: FontHelperValue) {
    const family = value?.family || this.options.default || '';
    return {
      toString() { return family; },
      family,
      import: family ? new SafeString(`<link href="https://fonts.googleapis.com/css2?family=${family.replace(' ', '+')}&display=swap" rel="stylesheet">`) : '',
    };
  }
}
