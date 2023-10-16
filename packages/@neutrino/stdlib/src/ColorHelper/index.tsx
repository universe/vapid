import './index.css';

import { DirectiveProps, SafeString, ValueHelper } from '@neutrino/core';
import { uuid } from '@universe/util';
import Color from 'color';
import colorjs from 'colorjs.io';
import { createPaletteFromColor } from 'palettey';
import { useEffect, useState } from 'preact/hooks';

interface ColorHelperOptions {
  placeholder: string;
  palette: boolean;
  cta: boolean;
  grayscale: boolean;
  alpha: boolean;
}

interface ColorHelperValue {
  hex: string;
  cta: string | null;
}

interface palette {
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

interface Ipalette {
  primary: string;
  primary0: string;
  primary1: string;
  primary2: string;
  primary3: string;
  primary4: string;
  primary5: string;
  primary6: string;
  primary7: string;
  primary8: string;
  primary9: string;
  primary10: string;

  cta: string;
  cta0: string;
  cta1: string;
  cta2: string;
  cta3: string;
  cta4: string;
  cta5: string;
  cta6: string;
  cta7: string;
  cta8: string;
  cta9: string;
  cta10: string;

  gray: string;
  gray0: string;
  gray1: string;
  gray2: string;
  gray3: string;
  gray4: string;
  gray5: string;
  gray6: string;
  gray7: string;
  gray8: string;
  gray9: string;
  gray10: string;
}

interface IpaletteText {
  primaryText: string;
  primary0Text: string;
  primary1Text: string;
  primary2Text: string;
  primary3Text: string;
  primary4Text: string;
  primary5Text: string;
  primary6Text: string;
  primary7Text: string;
  primary8Text: string;
  primary9Text: string;
  primary10Text: string;

  ctaText: string;
  cta0Text: string;
  cta1Text: string;
  cta2Text: string;
  cta3Text: string;
  cta4Text: string;
  cta5Text: string;
  cta6Text: string;
  cta7Text: string;
  cta8Text: string;
  cta9Text: string;
  cta10Text: string;
}

function getpaletteText(palette: Ipalette): IpaletteText {
  return {
    primaryText: getTextColorFor(palette.primary, palette),
    primary0Text: getTextColorFor(palette.primary0, palette),
    primary1Text: getTextColorFor(palette.primary1, palette),
    primary2Text: getTextColorFor(palette.primary2, palette),
    primary3Text: getTextColorFor(palette.primary3, palette),
    primary4Text: getTextColorFor(palette.primary4, palette),
    primary5Text: getTextColorFor(palette.primary5, palette),
    primary6Text: getTextColorFor(palette.primary6, palette),
    primary7Text: getTextColorFor(palette.primary7, palette),
    primary8Text: getTextColorFor(palette.primary8, palette),
    primary9Text: getTextColorFor(palette.primary9, palette),
    primary10Text: getTextColorFor(palette.primary10, palette),

    ctaText: getTextColorFor(palette.cta, palette),
    cta0Text: getTextColorFor(palette.cta0, palette),
    cta1Text: getTextColorFor(palette.cta1, palette),
    cta2Text: getTextColorFor(palette.cta2, palette),
    cta3Text: getTextColorFor(palette.cta3, palette),
    cta4Text: getTextColorFor(palette.cta4, palette),
    cta5Text: getTextColorFor(palette.cta5, palette),
    cta6Text: getTextColorFor(palette.cta6, palette),
    cta7Text: getTextColorFor(palette.cta7, palette),
    cta8Text: getTextColorFor(palette.cta8, palette),
    cta9Text: getTextColorFor(palette.cta9, palette),
    cta10Text: getTextColorFor(palette.cta10, palette),
  };
}

function getpalette(color: string, cta: string | null): Ipalette {
  const palette = createPaletteFromColor('primary', color.replaceAll('#', ''), { useLightness: true }).primary as unknown as palette;
  const ctapalette = cta ? createPaletteFromColor('primary', cta.replaceAll('#', ''), { useLightness: true }).primary as unknown as palette : null;

  return {
    primary:  palette[500],
    primary0: ensureLight(palette[50]),
    primary1: palette[100],
    primary2: palette[200],
    primary3: palette[300],
    primary4: palette[400],
    primary5: palette[500],
    primary6: palette[600],
    primary7: palette[700],
    primary8: palette[800],
    primary9: palette[900],
    primary10: ensureDark(palette[900]),

    cta: ctapalette?.[500] || Color(palette[500]).rotate(CTA_ROTATION).hex(),
    cta0: ctapalette?.[50] ? ensureLight(ctapalette?.[50]) : ensureLight(Color(palette[50]).rotate(CTA_ROTATION).hex()),
    cta1: ctapalette?.[100] || Color(palette[100]).rotate(CTA_ROTATION).hex(),
    cta2: ctapalette?.[200] || Color(palette[200]).rotate(CTA_ROTATION).hex(),
    cta3: ctapalette?.[300] || Color(palette[300]).rotate(CTA_ROTATION).hex(),
    cta4: ctapalette?.[400] || Color(palette[400]).rotate(CTA_ROTATION).hex(),
    cta5: ctapalette?.[500] || Color(palette[500]).rotate(CTA_ROTATION).hex(),
    cta6: ctapalette?.[600] || Color(palette[600]).rotate(CTA_ROTATION).hex(),
    cta7: ctapalette?.[700] || Color(palette[700]).rotate(CTA_ROTATION).hex(),
    cta8: ctapalette?.[800] || Color(palette[800]).rotate(CTA_ROTATION).hex(),
    cta9: ctapalette?.[900] || Color(palette[900]).rotate(CTA_ROTATION).hex(),
    cta10: ctapalette?.[500] ? ensureDark(ctapalette?.[500]) : ensureDark(Color(palette[900]).rotate(CTA_ROTATION).hex()),

    gray: Color(palette[500]).desaturate(GRAY_DESATURATION).hex(),
    gray0: ensureLight(Color(palette[50]).desaturate(GRAY_DESATURATION).alpha(95).hex()),
    gray1: Color(palette[100]).desaturate(GRAY_DESATURATION).hex(),
    gray2: Color(palette[200]).desaturate(GRAY_DESATURATION).hex(),
    gray3: Color(palette[300]).desaturate(GRAY_DESATURATION).hex(),
    gray4: Color(palette[400]).desaturate(GRAY_DESATURATION).hex(),
    gray5: Color(palette[500]).desaturate(GRAY_DESATURATION).hex(),
    gray6: Color(palette[600]).desaturate(GRAY_DESATURATION).hex(),
    gray7: Color(palette[700]).desaturate(GRAY_DESATURATION).hex(),
    gray8: Color(palette[800]).desaturate(GRAY_DESATURATION).hex(),
    gray9: Color(palette[900]).desaturate(GRAY_DESATURATION).hex(),
    gray10: ensureDark(Color(palette[900]).desaturate(GRAY_DESATURATION).hex()),
  };
}

function getTextColorFor(color: string, palette: Ipalette): string {
  const whiteContrast = colorjs.contrastAPCA(color, palette.gray0);
  const blackContrast = colorjs.contrastAPCA(color, palette.gray10);
  return Math.abs(whiteContrast) > Math.abs(blackContrast) ? palette.gray0 : palette.gray10;
}

function getpaletteCSS(palette: Ipalette, paletteText: IpaletteText) {
  return `
    --primary: ${palette.primary};
    --primary-0: ${palette.primary0};
    --primary-1: ${palette.primary1};
    --primary-2: ${palette.primary2};
    --primary-3: ${palette.primary3};
    --primary-4: ${palette.primary4};
    --primary-5: ${palette.primary5};
    --primary-6: ${palette.primary6};
    --primary-7: ${palette.primary7};
    --primary-8: ${palette.primary8};
    --primary-9: ${palette.primary9};
    --primary-10: ${palette.primary10};

    --primary-text:    ${paletteText.primaryText};
    --primary-0-text:  ${paletteText.primary0Text};
    --primary-1-text:  ${paletteText.primary1Text};
    --primary-2-text:  ${paletteText.primary2Text};
    --primary-3-text:  ${paletteText.primary3Text};
    --primary-4-text:  ${paletteText.primary4Text};
    --primary-5-text:  ${paletteText.primary5Text};
    --primary-6-text:  ${paletteText.primary6Text};
    --primary-7-text:  ${paletteText.primary7Text};
    --primary-8-text:  ${paletteText.primary8Text};
    --primary-9-text:  ${paletteText.primary9Text};
    --primary-10-text: ${paletteText.primary10Text};

    --cta: ${palette.cta};
    --cta-0: ${palette.cta0};
    --cta-1: ${palette.cta1};
    --cta-2: ${palette.cta2};
    --cta-3: ${palette.cta3};
    --cta-4: ${palette.cta4};
    --cta-5: ${palette.cta5};
    --cta-6: ${palette.cta6};
    --cta-7: ${palette.cta7};
    --cta-8: ${palette.cta8};
    --cta-9: ${palette.cta9};
    --cta-10: ${palette.cta10};

    --cta-text:    ${paletteText.ctaText};
    --cta-0-text:  ${paletteText.cta0Text};
    --cta-1-text:  ${paletteText.cta1Text};
    --cta-2-text:  ${paletteText.cta2Text};
    --cta-3-text:  ${paletteText.cta3Text};
    --cta-4-text:  ${paletteText.cta4Text};
    --cta-5-text:  ${paletteText.cta5Text};
    --cta-6-text:  ${paletteText.cta6Text};
    --cta-7-text:  ${paletteText.cta7Text};
    --cta-8-text:  ${paletteText.cta8Text};
    --cta-9-text:  ${paletteText.cta9Text};
    --cta-10-text: ${paletteText.cta10Text};

    --gray: ${palette.gray};
    --gray-0: ${palette.gray0};
    --gray-1: ${palette.gray1};
    --gray-2: ${palette.gray2};
    --gray-3: ${palette.gray3};
    --gray-4: ${palette.gray4};
    --gray-5: ${palette.gray5};
    --gray-6: ${palette.gray6};
    --gray-7: ${palette.gray7};
    --gray-8: ${palette.gray8};
    --gray-9: ${palette.gray9};
    --gray-10: ${palette.gray10};
  `;
}

export interface IPaletteProps {
  hidden?: boolean; 
  color: string;
  cta: string | null;
  onChange?: (color: string) => unknown;
  onChangeCta?: (color: string | null) => unknown;
  onDefaultCta?: (color: string) => unknown;
}

const NEXT_CHANGE: Map<string, string> = new Map();
const CHANGE_THROTTLES: Map<string, number> = new Map();

export const Palette = ({ hidden, color, cta, onChange, onChangeCta, onDefaultCta }: IPaletteProps) => {
  const [id] = useState(uuid());
  useEffect(() => {
    const palette = getpalette(color, cta);
    const paletteText = getpaletteText(palette);
    document.body.setAttribute('style', getpaletteCSS(palette, paletteText));
  }, [ color, cta ]);

  useEffect(() => {
    const palette = getpalette(color, null);
    onDefaultCta?.(palette.cta);
  }, [color]);

  return <ul class={`palette ${hidden === true ? 'palette--hidden' : ''}`}>
    <li class="palette__set">
      <ol class="palette__list">
        <li class="palette__color palette__color--0">0</li>
        <li class="palette__color palette__color--1">1</li>
        <li class="palette__color palette__color--2">2</li>
        <li class="palette__color palette__color--3">3</li>
        <li class="palette__color palette__color--4">4</li>
        <li class="palette__color palette__color--5">
          5
          <input class="palette__input" type="color" value={color} onInput={(evt) => {
              NEXT_CHANGE.set(id, (evt.target as HTMLInputElement).value);
              if (CHANGE_THROTTLES.has(id)) { return; }
              CHANGE_THROTTLES.set(id, window.requestAnimationFrame(() => {
                const value = NEXT_CHANGE.get(id);
                value && onChange?.(value);
                CHANGE_THROTTLES.delete(id);
                NEXT_CHANGE.delete(id);
              }));
            }}
          />
        </li>
        <li class="palette__color palette__color--6">6</li>
        <li class="palette__color palette__color--7">7</li>
        <li class="palette__color palette__color--8">8</li>
        <li class="palette__color palette__color--9">9</li>
        <li class="palette__color palette__color--10">10</li>
      </ol>
    </li>
    <li class="palette__set">
      <ol class="palette__list">
        <li class="palette__gray palette__gray--0">0</li>
        <li class="palette__gray palette__gray--1">1</li>
        <li class="palette__gray palette__gray--2">2</li>
        <li class="palette__gray palette__gray--3">3</li>
        <li class="palette__gray palette__gray--4">4</li>
        <li class="palette__gray palette__gray--5">5</li>
        <li class="palette__gray palette__gray--6">6</li>
        <li class="palette__gray palette__gray--7">7</li>
        <li class="palette__gray palette__gray--8">8</li>
        <li class="palette__gray palette__gray--9">9</li>
        <li class="palette__gray palette__gray--10">10</li>
      </ol>
    </li>
    <li class="palette__set">
      <ol class="palette__list">
        <li class="palette__cta palette__cta--0">0</li>
        <li class="palette__cta palette__cta--1">1</li>
        <li class="palette__cta palette__cta--2">2</li>
        <li class="palette__cta palette__cta--3">3</li>
        <li class="palette__cta palette__cta--4">4</li>
        <li class={`palette__cta palette__cta--5 palette__cta--${cta ? 'custom' : 'default'}`}>
          5
          <input class="palette__input" type="color" value={cta || ''} onInput={(evt) => {
            NEXT_CHANGE.set(id, (evt.target as HTMLInputElement).value);
            if (CHANGE_THROTTLES.has(id)) { return; }
            CHANGE_THROTTLES.set(id, window.requestAnimationFrame(() => {
              const value = NEXT_CHANGE.get(id);
              value && onChangeCta?.(value);
              CHANGE_THROTTLES.delete(id);
              NEXT_CHANGE.delete(id);
            }));
          }} />
          {cta && <button class="palette__clear-cta" onClick={() => onChangeCta?.(null)}>Use Default Secondary Color</button>}
        </li>
        <li class="palette__cta palette__cta--6">6</li>
        <li class="palette__cta palette__cta--7">7</li>
        <li class="palette__cta palette__cta--8">8</li>
        <li class="palette__cta palette__cta--9">9</li>
        <li class="palette__cta palette__cta--10">10</li>
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
      <Palette
        color={value.hex} 
        cta={value.cta || null} 
        onChange={(hex) => this.update({ hex, cta: value.cta })} 
        onChangeCta={(cta) => this.update({ hex: value.hex, cta })} 
      />
    </>;
  }

  async data(value: ColorHelperValue = this.default) {
    const color = new Color(value.hex);
    const palette = getpalette(value.hex, value.cta || null);
    const paletteText = getpaletteText(palette);
    return {
      toString() { return value.hex; },
      hex: value.hex,
      textColor: new SafeString(paletteText.primaryText),
      primaryTextColor: new SafeString(paletteText.primaryText),
      ctaTextColor: new SafeString(paletteText.ctaText),
      palette: {
        ...palette,
        ...paletteText,
        css: getpaletteCSS(palette, paletteText),
      },

      // TODO: Remove. For back compat.
      pallette: {
        ...palette,
        ...paletteText,
        css: getpaletteCSS(palette, paletteText),
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
