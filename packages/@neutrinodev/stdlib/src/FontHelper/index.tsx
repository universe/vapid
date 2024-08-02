import './index.css';

import { DirectiveProps, SafeString,ValueHelper } from '@neutrinodev/core';
// import { toTitleCase } from '@universe/util';
import { useId, useState } from 'preact/hooks';
import FontPicker from 'react-fontpicker-ts';

interface FontHelperOptions {
  default: string,
}

interface FontHelperValue {
  family: string;
  typekit?: false | string;
}

export default class FontHelper extends ValueHelper<FontHelperValue, FontHelperOptions> {

  default = { family: '' };

  input({ value }: DirectiveProps<FontHelperValue>) {
    const id = useId();
    const [ isFirstLoad, setIsFirstLoad ] = useState(true);
    const family = value?.family || this.options.default || '';

    // TODO: Allow users to supply their own typekit font URLs.
    // useEffect(() => {
    //   (async () => {
    //     const res = await window.fetch('https://use.typekit.net/oxy6irx.css');
    //     const css = await res.text();
    //     const fonts = [...css.matchAll(/font-family:"(.*)"/g)].map(f => toTitleCase(f[1]));
    //     console.log(fonts);
    //   })();
    // }, []);

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
