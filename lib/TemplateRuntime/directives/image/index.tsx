import { BaseDirective, DirectiveProps } from '../base';
import imageHandler from '../../../runners/VapidServer/Dashboard/imageHandler';

export const enum ImageType {
  JPEG = 'jpeg',
  PNG = 'png',
  SVG = 'svg',
  GIF = 'gif',
}

export interface ImageDirectiveValue {
  src: string;
  type: ImageType;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash: string;
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const DEFAULT = {
  src: TRANSPARENT_PIXEL,
  type: ImageType.GIF,
  width: 1,
  height: 1,
  aspectRatio: 1,
  blurhash: 'LPFYGm~U9D9H~p-pIVRiSbohakn}',
};

export default class ImageDirective extends BaseDirective<ImageDirectiveValue> {
  default = { ...DEFAULT }


  private onInput(evt: Event) {
    const el = evt.target as HTMLInputElement;
    if (el.tagName.toLowerCase() !== 'input' || el.getAttribute('type') !== 'file') { return; }
    const reader = new FileReader();
    const file = el.files?.[0];
    if (!file) {
      this.update({ ...this.default });
      return;
    }
    reader.onload = async(e) => {
      const src = (e.target?.result?.toString() || '');
      const data = await imageHandler('file', src, file.type) as { file: ImageDirectiveValue };
      this.update(data.file);
    };
    reader.readAsDataURL(file);
  }

  private async onSave(data: string) {
    const out = await imageHandler('file', data, 'image/png') as { file: ImageDirectiveValue };
    this.update(out.file);
  }

  /**
   * Renders inputs necessary to upload, preview, and optionally remove images
   */
  input({ name, value, directive }: DirectiveProps<ImageDirectiveValue, this>) {
    value = JSON.parse(JSON.stringify(value));
    const src = value?.src && value.src !== TRANSPARENT_PIXEL ? `${directive.meta.media.host}/${value.src}` : TRANSPARENT_PIXEL;
    const hasSrc = src !== TRANSPARENT_PIXEL;
    return <div class="previewable">
      <input type="file" name={name} accept="image/*" aria-describedby={`help-${name}`} onInput={directive.onInput.bind(directive)} />
      <input type="hidden" name={`${name}[src]`} value={value?.src || ''} aria-describedby={`help-${name}`} />
      <img class="preview" src={src} id={name}></img>
      {hasSrc ? <button class="remove-image-button" onClick={(evt) => { evt.preventDefault(); directive.update({ ...DEFAULT }); }}>Remove</button> : null}
      {hasSrc ? <button class="edit-image-button" data-name={name} onClick={async(evt) => {
        evt.preventDefault();
        const { editImage } = await import('./editor');
        editImage(src, directive.onSave.bind(directive))
      }}>Edit</button> : null}
    </div>;
  }

  /**
   * Renders image src or block data
   */
  async render(value: ImageDirectiveValue = this.default): Promise<ImageDirectiveValue> {
    const src = (value?.src && value.src?.indexOf('data:') === -1) ? `${this.meta.media.host}/${value.src}` : value.src;
    return {
      ...value,
      src: src || this.default.src,
      toString() { return src || TRANSPARENT_PIXEL; }
    } as ImageDirectiveValue;
  }

  /**
   * A preview of the image
   *
   * @param {string} fileName
   * @return {string}
   */
  preview(value: ImageDirectiveValue = this.default) {
    const src = value?.src?.indexOf('data:') === -1 ? `${this.meta.media.host}/${value.src}` : value.src;
    return <img src={src || TRANSPARENT_PIXEL} />;
  }
}
