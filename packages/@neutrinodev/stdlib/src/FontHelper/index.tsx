import './index.css';

import { DirectiveProps, SafeString,ValueHelper } from '@neutrinodev/core';
import { useId, useState } from 'preact/hooks';
import FontPicker from 'react-fontpicker-ts';

interface FontHelperOptions {
  default: string,
}

interface FontHelperValue {
  family: string;
}

export default class FontHelper extends ValueHelper<FontHelperValue, FontHelperOptions> {

  default = { family: '' };

  input({ value }: DirectiveProps<FontHelperValue>) {
    const id = useId();
    const [ isFirstLoad, setIsFirstLoad ] = useState(true);
    const family = value?.family || this.options.default || '';
    console.log(family);
    return <fieldset id={id} tabIndex={-1}>
      <FontPicker defaultValue={family} value={(value: string) => {
        if (isFirstLoad || family === value) {
          setIsFirstLoad(false);
          return;
        }
        document.getElementById(id)?.focus();
        this.update({ family: value || '' });
      }} />
    </fieldset>;
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
