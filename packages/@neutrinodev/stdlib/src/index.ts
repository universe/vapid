import { default as and } from './AndHelper.js';
import { default as arr } from './ArrayHelper.js';
import { default as choice } from './ChoiceHelper/index.js';
import { default as collate } from './CollateHelper.js';
import { default as collection } from './CollectionHelper.js';
import { default as color, Palette } from './ColorHelper/index.js';
import { default as count } from './CountHelper.js';
import { default as date } from './DateHelper.js';
import { default as docs } from './DocsHelper.js';
import { default as each } from './EachHelper.js';
import { default as emailform } from './EmailHelper/index.js';
import { default as eq } from './EqHelper.js';
import { default as font } from './FontHelper/index.js';
import { default as html } from './HtmlHelper/index.js';
import { default as ifHelper } from './IfHelper.js';
import { default as image } from './ImageHelper/index.js';
import { default as link } from './LinkHelper.js';
import { default as log } from './LogHelper.js';
import { default as markdown } from './MarkdownHelper/index.js';
import { default as math } from './MathHelper.js';
import { default as number } from './NumberHelper.js';
import { default as or } from './OrHelper.js';
import { default as text } from './TextHelper.js';
import { default as unless } from './UnlessHelper.js';
import { default as url } from './UrlHelper.js';

const helpers = {
  and,
  arr,
  choice,
  collate,
  collection,
  color,
  count,
  date,
  docs,
  each,
  emailform,
  eq,
  font,
  html,
  if: ifHelper,
  image,
  link,
  log,
  markdown,
  math,
  number,
  or,
  text,
  unless,
  url,
};

export default helpers;

export {
  Palette,
};
