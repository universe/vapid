import './index.css';

import { DirectiveProps, SafeString,ValueHelper } from '@neutrino/core';
import Color from 'color';
import colorjs from 'colorjs.io';
import { createPalleteFromColor } from 'palettey';
import { useEffect } from 'preact/hooks';

interface ColorHelperOptions {
  placeholder: string,
}

interface ColorHelperValue {
  hex: string;
  cta: string | null;
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

function getPallette(color: string, cta: string | null) {
  const pallette = createPalleteFromColor('primary', color.replaceAll('#', ''), { useLightness: true }).primary as unknown as Pallette;
  const ctaPallette = cta ? createPalleteFromColor('primary', cta.replaceAll('#', ''), { useLightness: true }).primary as unknown as Pallette : null;

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

    cta: ctaPallette?.[500] || Color(pallette[500]).rotate(CTA_ROTATION).hex(),
    cta0: ctaPallette?.[50] ? ensureLight(ctaPallette?.[50]) : ensureLight(Color(pallette[50]).rotate(CTA_ROTATION).hex()),
    cta1: ctaPallette?.[100] || Color(pallette[100]).rotate(CTA_ROTATION).hex(),
    cta2: ctaPallette?.[200] || Color(pallette[200]).rotate(CTA_ROTATION).hex(),
    cta3: ctaPallette?.[300] || Color(pallette[300]).rotate(CTA_ROTATION).hex(),
    cta4: ctaPallette?.[400] || Color(pallette[400]).rotate(CTA_ROTATION).hex(),
    cta5: ctaPallette?.[500] || Color(pallette[500]).rotate(CTA_ROTATION).hex(),
    cta6: ctaPallette?.[600] || Color(pallette[600]).rotate(CTA_ROTATION).hex(),
    cta7: ctaPallette?.[700] || Color(pallette[700]).rotate(CTA_ROTATION).hex(),
    cta8: ctaPallette?.[800] || Color(pallette[800]).rotate(CTA_ROTATION).hex(),
    cta9: ctaPallette?.[900] || Color(pallette[900]).rotate(CTA_ROTATION).hex(),
    cta10: ctaPallette?.[500] ? ensureDark(ctaPallette?.[500]) : ensureDark(Color(pallette[900]).rotate(CTA_ROTATION).hex()),

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

function getPalletteCSS(color: string, cta: string | null) {
  const pallette = getPallette(color, cta);
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

export interface IPalletteProps {
  hidden?: boolean; 
  color: string;
  cta: string | null;
  onChange?: (color: string) => any;
  onChangeCta?: (color: string | null) => any;
  onDefaultCta?: (color: string) => any;
}

export const Pallette = ({ hidden, color, cta, onChange, onChangeCta, onDefaultCta }: IPalletteProps) => {
  useEffect(() => {
    document.body.setAttribute('style', getPalletteCSS(color, cta));
  }, [ color, cta ]);

  useEffect(() => {
    const pallette = getPallette(color, null);
    onDefaultCta?.(pallette.cta);
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
          <input class="pallette__input" type="color" value={color} onInput={(evt) => onChange?.((evt.target as HTMLInputElement).value)} />
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
        <li class="pallette__cta pallette__cta--5">
          5
          <input class="pallette__input" type="color" value={cta || ''} onInput={(evt) => onChangeCta?.((evt.target as HTMLInputElement).value)} />
          {cta && <button class="pallette__clear-cta" onClick={() => onChangeCta?.(null)}>Use Default Secondary Color</button>}
        </li>
        <li class="pallette__cta pallette__cta--6">6</li>
        <li class="pallette__cta pallette__cta--7">7</li>
        <li class="pallette__cta pallette__cta--8">8</li>
        <li class="pallette__cta pallette__cta--9">9</li>
        <li class="pallette__cta pallette__cta--10">10</li>
      </ol>
    </li>
  </ul>;
};

// let update: number | null = null;

export default class ColorHelper extends ValueHelper<ColorHelperValue, ColorHelperOptions> {

  default = { hex: '#000000', cta: null };

  /**
   * Renders either a text or textarea input
   */
  input({ value = this.default }: DirectiveProps<ColorHelperValue>) {
    return <>
      <Pallette 
        color={value.hex} 
        cta={value.cta || null} 
        onChange={(hex) => this.update({ hex, cta: value.cta })} 
        onChangeCta={(cta) => this.update({ hex: value.hex, cta })} 
      />
    </>;
  }

  async data(value: ColorHelperValue = this.default) {
    const color = new Color(value.hex);
    const pallette = getPallette(value.hex, value.cta || null);
    const ctaWhiteContrast = colorjs.contrastAPCA(value.hex, pallette.gray0);
    const ctaBlackContrast = colorjs.contrastAPCA(value.hex, pallette.gray10);
    const primaryWhiteContrast = colorjs.contrastAPCA(value.hex, pallette.gray0);
    const primaryBlackContrast = colorjs.contrastAPCA(value.hex, pallette.gray10);
    return {
      toString() { return value.hex; },
      hex: value.hex,
      textColor: new SafeString(Math.abs(primaryWhiteContrast) > Math.abs(primaryBlackContrast) ? pallette.gray0 : pallette.gray10),
      primaryTextColor: new SafeString(Math.abs(ctaWhiteContrast) > Math.abs(ctaBlackContrast) ? pallette.gray0 : pallette.gray10),
      ctaTextColor: new SafeString(Math.abs(primaryWhiteContrast) > Math.abs(primaryBlackContrast) ? pallette.gray0 : pallette.gray10),
      pallette: {
        ...pallette,
        css: getPalletteCSS(value.hex, value.cta || null),
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
