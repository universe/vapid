import { DirectiveProps, NeutrinoHelperOptions, SafeString,ValueHelper } from '@neutrino/core';
// import { FocusPicker } from './focus.js';
// import { editImage } from './editor.js';
import { useRef } from 'preact/hooks';

export enum ImageType {
  JPEG = 'jpeg',
  PNG = 'png',
  SVG = 'svg',
  GIF = 'gif',
}

export interface ImageHelperValue {
  src: string;
  type: ImageType;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash: string;
  focus: { x: number; y: number; };
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const DEFAULT = {
  src: TRANSPARENT_PIXEL,
  type: ImageType.GIF,
  width: 1,
  height: 1,
  aspectRatio: 1,
  blurhash: '',
  focus: { x: 0, y: 0 },
};

export default class ImageHelper extends ValueHelper<ImageHelperValue> {
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
      const data = await ValueHelper.emitFile('file', src, file.type) as { file: ImageHelperValue };
      this.update(data.file);
    };
    reader.readAsDataURL(file);
  }

  private async onSave(data: string) {
    const out = await ValueHelper.emitFile('file', data, 'image/png') as { file: ImageHelperValue };
    this.update(out.file);
  }

  private getRealUrl(src: string): string {
    if (src !== TRANSPARENT_PIXEL && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      return `${this.meta.media}/${src}`;
    }
    return src;
  }

  /**
   * Renders inputs necessary to upload, preview, and optionally remove images
   */
  input({ name, value: update = this.default, directive }: DirectiveProps<ImageHelperValue, this>) {
    const value = useRef<ImageHelperValue>(update);
    const directiveRef = useRef<ImageHelper>(directive);
    directiveRef.current = directive;
    value.current = JSON.parse(JSON.stringify(update));
    const src = this.getRealUrl(value.current.src);
    const hasSrc = src !== TRANSPARENT_PIXEL;
    return <div class="previewable">
      {src === TRANSPARENT_PIXEL ? <input type="file" name={name} accept="image/*" aria-describedby={`help-${name}`} onInput={directive.onInput.bind(directive)} /> : null}
      <input type="hidden" name={`${name}[src]`} value={value.current?.src || ''} aria-describedby={`help-${name}`} />
      <div class={`preview ${src === TRANSPARENT_PIXEL ? 'image-directive__empty-preview' : ''}`} >
        <img src={src} id={name} data-focus-x={value.current?.focus?.x || 0} data-focus-y={value.current?.focus?.y || 0} ref={async(ref) => {
          if (!ref) { return; }
          const { FocusPicker } = await import('./focus');
          new FocusPicker(ref, {
            onChange: (focus: { x: number; y: number; }) => {
              if (value.current?.focus?.x === focus.x && value.current?.focus?.y === focus.y) { return; }
              directiveRef.current.update({ ...value.current, focus });
            },
          });
        }} />
      </div>
      {hasSrc ? <button class="remove-image-button" onClick={(evt) => { evt.preventDefault(); directive.update({ ...DEFAULT }); }}>Remove</button> : null}
      {hasSrc ? <button class="edit-image-button" data-name={name} onClick={async(evt) => {
        evt.preventDefault();
        const { editImage } = await import('./editor');
        editImage(src, directive.onSave.bind(directive));
      }}>Edit</button> : null}
    </div>;
  }

  /**
   * Renders image src or block data
   */
  async data(value: ImageHelperValue = this.default): Promise<ImageHelperValue> {
    const src = this.getRealUrl(value.src);
    return {
      ...value,
      src: src || this.default.src,
      toString() { return src || TRANSPARENT_PIXEL; },
    } as ImageHelperValue;
  }

  /**
   * A preview of the image
   *
   * @param {string} fileName
   * @return {string}
   */
  preview(value: ImageHelperValue = this.default) {
    const src = this.getRealUrl(value.src);
    return <img src={src || TRANSPARENT_PIXEL} data-focus-x={value?.focus?.x || 0} data-focus-y={value?.focus?.y || 0} />;
  }

  render([image]: [string], _hash = {}, options: NeutrinoHelperOptions) {
    if (!image) { return options.inverse ? options.inverse() : ''; }
    return image ? (options.block?.([image]) || '') : '';
  }

  inject() {
    return new SafeString(`
      <script>
        function getBackgroundColor(el) {
          const bounds = el.getBoundingClientRect();
          const els = document.elementFromPoint(bounds.x + (bouds.width / 2), bounds.y + (bounds.height / 2));
        }
        function _unsupportedIterableToArray(o, minLen) {
          if (!o) return;
          if (typeof o === "string") return _arrayLikeToArray(o, minLen);
          var n = Object.prototype.toString.call(o).slice(8, -1);
          if (n === "Object" && o.constructor) n = o.constructor.name;
          if (n === "Map" || n === "Set") return Array.from(o);
          if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
        }
        
        function _arrayLikeToArray(arr, len) {
          if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2;
        }

        function _createForOfIteratorHelperLoose(o) {
          var i = 0;
          if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
            if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) return function () {
              if (i >= o.length) return { done: true };
              return { done: false, value: o[i++] };
            };
            throw new TypeError("Invalid attempt to iterate non-iterable instance. In order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
          }
          i = o[Symbol.iterator]();
          return i.next.bind(i);
        }
        
        var QUERY_SELECTOR = 'img[data-focus-x][data-focus-y]';
        window.addEventListener('DOMContentLoaded', function() {
          var observing = new WeakSet(); // Calculate the new left/top percentage shift of an image

          function calcShift(containerSize, imageSize, focusSize, toMinus) {
            var res = 50 * focusSize + 1 / ((imageSize - containerSize) / containerSize) * 50 * focusSize;
            return Math.min(Math.max(50 + (toMinus ? -1 : 1) * res, 0), 100);
          }
        
          function applyShift(img, elementW, elementH) {
            if (img.__FOCUS_PICKER__) {
              return;
            }
        
            var imageW = img.naturalWidth,
                imageH = img.naturalHeight;
            var focus = {
              x: parseFloat(img.getAttribute('data-focus-x')) || 0,
              y: parseFloat(img.getAttribute('data-focus-y')) || 0
            }; // Amount position will be shifted
        
            var hShift = 50;
            var vShift = 50; // Need dimensions to proceed
        
            if (!(elementW > 0 && elementH > 0 && imageW > 0 && imageH > 0)) {
              return false;
            } // Which is over by more?
        
        
            var wR = imageW / elementW;
            var hR = imageH / elementH;
        
            if (wR > hR) {
              hShift = calcShift(elementW, imageW / hR, focus.x);
            } else if (wR < hR) {
              vShift = calcShift(elementH, imageH / wR, focus.y, true);
            }
        
            img.style.objectFit = 'cover';
            img.style.objectPosition = hShift + "% " + vShift + "%";
          }
        
          function applyToEvent(evt) {
            var img = evt.target;
        
            var _img$getBoundingClien = img.getBoundingClientRect(),
                width = _img$getBoundingClien.width,
                height = _img$getBoundingClien.height;
        
            applyShift(img, width, height);
          }
        
          var observer = new ResizeObserver(function (entries) {
            for (var _iterator = _createForOfIteratorHelperLoose(entries), _step; !(_step = _iterator()).done;) {
              var entry = _step.value;
              var img = entry.target;
              var _entry$borderBoxSize$ = entry.borderBoxSize[0],
                  width = _entry$borderBoxSize$.inlineSize,
                  height = _entry$borderBoxSize$.blockSize;
              applyShift(img, width, height);
            }
          });
          var mutations = new MutationObserver(function (entries) {
            for (var _iterator2 = _createForOfIteratorHelperLoose(entries), _step2; !(_step2 = _iterator2()).done;) {
              var entry = _step2.value;
        
              switch (entry.type) {
                case 'childList':
                  {
                    for (var _i = 0, _Array$from = Array.from(entry.removedNodes); _i < _Array$from.length; _i++) {
                      var el = _Array$from[_i];
        
                      if (!el || !el.matches || !el.matches(QUERY_SELECTOR)) {
                        continue;
                      }
        
                      if (observing.has(el)) {
                        observing["delete"](el);
                        observer.unobserve(el);
                        el.removeEventListener('load', applyToEvent);
                      }
                    }
        
                    for (var _i2 = 0, _Array$from2 = Array.from(entry.addedNodes); _i2 < _Array$from2.length; _i2++) {
                      var _el = _Array$from2[_i2];
        
                      if (!_el || !_el.matches || !_el.matches(QUERY_SELECTOR)) {
                        continue;
                      }
        
                      if (!observing.has(_el)) {
                        observing.add(_el);
                        observer.observe(_el);
        
                        _el.addEventListener('load', applyToEvent);
                      }
                    }
        
                    break;
                  }
        
                case 'attributes':
                  {
                    var img = entry.target;
        
                    var _img$getBoundingClien2 = img.getBoundingClientRect(),
                        width = _img$getBoundingClien2.width,
                        height = _img$getBoundingClien2.height;
        
                    applyShift(img, width, height);
                    break;
                  }
              }
            }
          });
        
          for (var _i3 = 0, _Array$from3 = Array.from(document.querySelectorAll(QUERY_SELECTOR)); _i3 < _Array$from3.length; _i3++) {
            var img = _Array$from3[_i3];
        
            var _img$getBoundingClien3 = img.getBoundingClientRect(),
                width = _img$getBoundingClien3.width,
                height = _img$getBoundingClien3.height;
        
            if (!observing.has(img)) {
              observing.add(img);
              observer.observe(img);
              img.addEventListener('load', applyToEvent);
            }
        
            applyShift(img, width, height);
          }
        
          mutations.observe(document.body, {
            subtree: true,
            childList: true,
            attributeFilter: ['data-focus-x', 'data-focus-y']
          });
        });
      </script>
    `);
  }
}
