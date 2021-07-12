import * as fs from 'fs';
import * as path from 'path';
import { imageSize } from 'image-size';

import { BaseDirective } from './base';

const enum ImageType {
  JPEG = 'jpeg',
  PNG = 'png',
  SVG = 'svg',
  GIF = 'gif',
}
interface ImageDirectiveValue {
  src: string;
  type: ImageType;
  width: number;
  height: number;
  aspectRatio: number;
}

export default class ImageDirective extends BaseDirective<ImageDirectiveValue> {

  options = {
    default: {
      src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      type: ImageType.GIF,
      width: 1,
      height: 1,
      aspectRatio: 1,
    },
    label: '',
    help: '',
    priority: 0,
  }

  attrs = {
    required: false,
    placeholder: ''
  }

  /**
   * Renders inputs necessary to upload, preview, and optionally remove images
   *
   * @param {string} name
   * @param {string} [value=this.options.default]
   * @return {string} rendered HTML
   *
   * eslint-disable class-methods-use-this
   */
  input(name: string, value: ImageDirectiveValue | null = null ) {
    const inputs = `<input type="file" name="${name}" accept="image/*" aria-describedby="help-${name}">
                  <input type="hidden" name="${name}" value="${value || ''}" aria-describedby="help-${name}">`;
    const src = value ? `/uploads/${value}` : '';
    const preview = `<img class="preview" src="${src}" id="${name}">`;
    const destroyName = name.replace('content', '_destroy');
    const destroy = !this.attrs.required
      ? `<div class="ui checkbox">
            <input type="checkbox" name="${destroyName}" id="${destroyName}">
            <label for="${destroyName}">Remove</label>
          </div>`
      : '';

    return `
      <div class="previewable">
        ${inputs}
        ${preview}
        ${destroy}
        <button id="edit-image-button" data-name="${name}">Edit</button>
      </div>`;
  }

  /**
   * Renders image src or block data
   */
  async render(value: ImageDirectiveValue = this.options.default) {
    const src = value.src?.indexOf('data:') === -1
      ? `/uploads/${value.src}`
      : value.src;

    const onDisk =  value.src ? path.join(process.cwd(), 'data/uploads',  value.src) : null;
    const size = (onDisk && fs.existsSync(onDisk) && imageSize(onDisk)) || { width: 1, height: 1, type: 'gif' };

    return {
      src,
      width: size.width,
      height: size.height,
      type: size.type,
      aspectRatio: (size.height && size.width) ? (size.height / size.width) : 1,
      toString() { return src; }
    };
  }

  /**
   * A preview of the image
   *
   * @param {string} fileName
   * @return {string}
   */
  preview(value: ImageDirectiveValue = this.options.default) {
    const src = value?.src?.indexOf('data:') === -1
      ? `/uploads/${value.src}`
      : value.src;
    return `<img src="${src}" />`;
  }
}
