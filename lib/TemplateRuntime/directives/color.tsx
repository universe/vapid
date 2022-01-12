import { Fragment } from 'preact';
import Color from 'color';

import { BaseDirective, DirectiveProps } from './base';

interface ColorDirectiveOptions {
  placeholder: string,
}

interface ColorDirectiveValue {
  hex: string;
};

export default class ColorDirective extends BaseDirective<ColorDirectiveValue, ColorDirectiveOptions> {

  default = { hex: '#000000' };

  /**
   * Renders either a text or textarea input
   */
  input({ name, value = this.default }: DirectiveProps<ColorDirectiveValue>) {
    const EyeDropper = (window as any)?.EyeDropper as { new(): { open(): Promise<{ sRGBHex: string; }>} };
    return <Fragment>
      <input
        {...this.options}
        type="color"
        name={name}
        aria-describedby={`help-${name}`}
        value={value.hex || this.options.placeholder || this.default.hex}
        onChange={(evt) => {
          const hex = (evt.target as HTMLInputElement).value;
          this.update({ hex });
        }}
      />
      <button onClick={async() => {
        const eyeDropper = new EyeDropper();
        const result = await eyeDropper.open();
        this.update({ hex: result.sRGBHex });
      }}>Eyedropper</button>
    </Fragment>
  }

  async render(value: ColorDirectiveValue) {
    const color = new Color(value.hex);
    return {
      toString() { return value.hex; },
      hex: value.hex,

      rgb: color.rgb().string(),
      red: color.red(),
      green: color.green(),
      blue: color.blue(),

      hsl: color.hsl().string(),
      hue: color.hue(),
      saturation: color.saturationl(),
      lightness: color.lightness(),

      cyan: color.cyan(),
      yellow: color.yellow(),
      magenta: color.magenta(),
      black: color.black(),

      isDark: color.isDark(),
      isLight: color.isLight(),
    }
  }
}
