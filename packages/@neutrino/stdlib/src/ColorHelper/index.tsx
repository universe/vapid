import './index.css';

import { DirectiveProps,ValueHelper } from '@neutrino/core';
import Color from 'color';
import { createPalleteFromColor } from 'palettey';
import { useEffect, useState } from 'preact/hooks';

interface ColorHelperOptions {
  placeholder: string,
}

interface ColorHelperValue {
  hex: string;
}

interface Pallette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

const CTA_ROTATION = 120;
const GRAY_DESATURATION = 0.88;

function ensureLight(color: string) {
  let matte = Color(color);
  let luminosity = matte.luminosity();
  let lightness = matte.lightness();
  while (luminosity < 0.95 && lightness < 100) {
    lightness++;
    matte = matte.lightness(lightness);
    luminosity = matte.luminosity();
  }
  return matte.hex();
}

function ensureDark(color: string) {
  let matte = Color(color);
  let luminosity = matte.luminosity();
  let lightness = matte.lightness();
  while (luminosity > 0.005 && lightness > 0) {
    lightness--;
    matte = matte.lightness(lightness);
    luminosity = matte.luminosity();
  }
  return matte.hex();
}

function getPallette(color: string) {
  const pallette = createPalleteFromColor('primary', color.replaceAll('#', ''), { useLightness: true }).primary as unknown as Pallette;

  return {
    primary:  pallette[500],
    primary0: ensureLight(pallette[50]),
    primary1: pallette[100],
    primary2: pallette[200],
    primary3: pallette[300],
    primary4: pallette[400],
    primary5: pallette[500],
    primary6: pallette[600],
    primary7: pallette[700],
    primary8: pallette[800],
    primary9: pallette[900],
    primary10: ensureDark(pallette[900]),

    cta: Color(pallette[500]).rotate(CTA_ROTATION).hex(),
    cta0: ensureLight(Color(pallette[50]).rotate(CTA_ROTATION).hex()),
    cta1: Color(pallette[100]).rotate(CTA_ROTATION).hex(),
    cta2: Color(pallette[200]).rotate(CTA_ROTATION).hex(),
    cta3: Color(pallette[300]).rotate(CTA_ROTATION).hex(),
    cta4: Color(pallette[400]).rotate(CTA_ROTATION).hex(),
    cta5: Color(pallette[500]).rotate(CTA_ROTATION).hex(),
    cta6: Color(pallette[600]).rotate(CTA_ROTATION).hex(),
    cta7: Color(pallette[700]).rotate(CTA_ROTATION).hex(),
    cta8: Color(pallette[800]).rotate(CTA_ROTATION).hex(),
    cta9: Color(pallette[900]).rotate(CTA_ROTATION).hex(),
    cta10: ensureDark(Color(pallette[900]).rotate(CTA_ROTATION).hex()),

    gray: Color(pallette[500]).desaturate(GRAY_DESATURATION).hex(),
    gray0: ensureLight(Color(pallette[50]).desaturate(GRAY_DESATURATION).alpha(95).hex()),
    gray1: Color(pallette[100]).desaturate(GRAY_DESATURATION).hex(),
    gray2: Color(pallette[200]).desaturate(GRAY_DESATURATION).hex(),
    gray3: Color(pallette[300]).desaturate(GRAY_DESATURATION).hex(),
    gray4: Color(pallette[400]).desaturate(GRAY_DESATURATION).hex(),
    gray5: Color(pallette[500]).desaturate(GRAY_DESATURATION).hex(),
    gray6: Color(pallette[600]).desaturate(GRAY_DESATURATION).hex(),
    gray7: Color(pallette[700]).desaturate(GRAY_DESATURATION).hex(),
    gray8: Color(pallette[800]).desaturate(GRAY_DESATURATION).hex(),
    gray9: Color(pallette[900]).desaturate(GRAY_DESATURATION).hex(),
    gray10: ensureDark(Color(pallette[900]).desaturate(GRAY_DESATURATION).hex()),
  };
}

function getPalletteCSS(color: string) {
  const pallette = getPallette(color);
  return `
    --primary: ${pallette.primary};
    --primary-0: ${pallette.primary0};
    --primary-1: ${pallette.primary1};
    --primary-2: ${pallette.primary2};
    --primary-3: ${pallette.primary3};
    --primary-4: ${pallette.primary4};
    --primary-5: ${pallette.primary5};
    --primary-6: ${pallette.primary6};
    --primary-7: ${pallette.primary7};
    --primary-8: ${pallette.primary8};
    --primary-9: ${pallette.primary9};
    --primary-10: ${pallette.primary10};

    --cta: ${pallette.cta};
    --cta-0: ${pallette.cta0};
    --cta-1: ${pallette.cta1};
    --cta-2: ${pallette.cta2};
    --cta-3: ${pallette.cta3};
    --cta-4: ${pallette.cta4};
    --cta-5: ${pallette.cta5};
    --cta-6: ${pallette.cta6};
    --cta-7: ${pallette.cta7};
    --cta-8: ${pallette.cta8};
    --cta-9: ${pallette.cta9};
    --cta-10: ${pallette.cta10};

    --gray: ${pallette.gray};
    --gray-0: ${pallette.gray0};
    --gray-1: ${pallette.gray1};
    --gray-2: ${pallette.gray2};
    --gray-3: ${pallette.gray3};
    --gray-4: ${pallette.gray4};
    --gray-5: ${pallette.gray5};
    --gray-6: ${pallette.gray6};
    --gray-7: ${pallette.gray7};
    --gray-8: ${pallette.gray8};
    --gray-9: ${pallette.gray9};
    --gray-10: ${pallette.gray10};
  `;
}

export const Pallette = ({ hidden, color, onChange }: { hidden?: boolean; color: string, onChange?: (color: string) => any }) => {
  const [ localColor, _setLocalColor ] = useState(color);
  useEffect(() => {
    document.body.setAttribute('style', getPalletteCSS(color));
  }, [color]);
  return <ul class={`pallette ${hidden === true ? 'pallette--hidden' : ''}`}>
    <li class="pallette__set">
      <ol class="pallette__list">
        <li class="pallette__color pallette__color--0">0</li>
        <li class="pallette__color pallette__color--1">1</li>
        <li class="pallette__color pallette__color--2">2</li>
        <li class="pallette__color pallette__color--3">3</li>
        <li class="pallette__color pallette__color--4">4</li>
        <li class="pallette__color pallette__color--5">
          5
          <input class="pallette__input" type="color" value={localColor} onInput={(evt) => onChange?.((evt.target as HTMLInputElement).value)} />
        </li>
        <li class="pallette__color pallette__color--6">6</li>
        <li class="pallette__color pallette__color--7">7</li>
        <li class="pallette__color pallette__color--8">8</li>
        <li class="pallette__color pallette__color--9">9</li>
        <li class="pallette__color pallette__color--10">10</li>
      </ol>
    </li>
    <li class="pallette__set">
      <ol class="pallette__list">
        <li class="pallette__gray pallette__gray--0">0</li>
        <li class="pallette__gray pallette__gray--1">1</li>
        <li class="pallette__gray pallette__gray--2">2</li>
        <li class="pallette__gray pallette__gray--3">3</li>
        <li class="pallette__gray pallette__gray--4">4</li>
        <li class="pallette__gray pallette__gray--5">5</li>
        <li class="pallette__gray pallette__gray--6">6</li>
        <li class="pallette__gray pallette__gray--7">7</li>
        <li class="pallette__gray pallette__gray--8">8</li>
        <li class="pallette__gray pallette__gray--9">9</li>
        <li class="pallette__gray pallette__gray--10">10</li>
      </ol>
    </li>
    <li class="pallette__set">
      <ol class="pallette__list">
        <li class="pallette__cta pallette__cta--0">0</li>
        <li class="pallette__cta pallette__cta--1">1</li>
        <li class="pallette__cta pallette__cta--2">2</li>
        <li class="pallette__cta pallette__cta--3">3</li>
        <li class="pallette__cta pallette__cta--4">4</li>
        <li class="pallette__cta pallette__cta--5">5</li>
        <li class="pallette__cta pallette__cta--6">6</li>
        <li class="pallette__cta pallette__cta--7">7</li>
        <li class="pallette__cta pallette__cta--8">8</li>
        <li class="pallette__cta pallette__cta--9">9</li>
        <li class="pallette__cta pallette__cta--10">10</li>
      </ol>
    </li>
  </ul>;
};

export default class ColorHelper extends ValueHelper<ColorHelperValue, ColorHelperOptions> {

  default = { hex: '#000000' };

  /**
   * Renders either a text or textarea input
   */
  input({ name, value = this.default }: DirectiveProps<ColorHelperValue>) {
    // const EyeDropper = (window as any)?.EyeDropper as { new(): { open(): Promise<{ sRGBHex: string; }>} };
    const hex = value.hex || this.options.placeholder || this.default.hex;
    const pallette = getPallette(hex);
    return <>
      <input
        {...this.options}
        type="color"
        name={name}
        aria-describedby={`help-${name}`}
        value={hex}
        onChange={(evt) => {
          const hex = (evt.target as HTMLInputElement).value;
          this.update({ hex });
        }}
      />
      {/* <button onClick={async() => {
        const eyeDropper = new EyeDropper();
        const result = await eyeDropper.open();
        this.update({ hex: result.sRGBHex });
      }}>Eyedropper</button> */}
      <Pallette color={value.hex} onChange={(hex) => this.update({ hex })} />
      <input
        {...this.options}
        type="color"
        name={name}
        aria-describedby={`help-${name}`}
        value={pallette.cta}
        onChange={(evt) => {
          const hex = (evt.target as HTMLInputElement).value;
          this.update({ hex });
        }}
      />
    </>;
  }

  async data(value: ColorHelperValue) {
    const color = new Color(value.hex);
    const pallette = getPallette(value.hex);
    return {
      toString() { return value.hex; },
      hex: value.hex,
      pallette: {
        ...pallette,
        css: getPalletteCSS(value.hex),
      },

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
    };
  }
}
