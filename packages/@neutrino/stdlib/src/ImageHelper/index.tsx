/* eslint-disable max-len */
import { DirectiveProps, NeutrinoHelperOptions, SafeString, ValueHelper } from '@neutrino/core';
import { Focus, FocusPicker,FocusState } from '@universe/image-focus';
import jsonStringify from 'fast-json-stable-stringify';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

import { editImage } from './editor.js';

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
  focus: FocusState;
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const DEFAULT: ImageHelperValue = {
  src: TRANSPARENT_PIXEL,
  type: ImageType.GIF,
  width: 1,
  height: 1,
  aspectRatio: 1,
  focus: Focus.stamp(),
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (...args) => reject(args);
    img.src = src;
  });
}

function getImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  const MAX_BOUND = 600;
  const newWidth = image.width > image.height ? MAX_BOUND : ((image.width / image.height) * MAX_BOUND);
  const newHeight = image.height > image.width ? MAX_BOUND : ((image.height / image.width) * MAX_BOUND);
  canvas.width = newWidth;
  canvas.height = newHeight;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, newWidth, newHeight);
  return context.getImageData(0, 0, newWidth, newHeight);
}

async function fetchImageMeta(imageUrl: string): Promise<{ width: number; height: number; }> {
  const image = await loadImage(imageUrl);
  const imageData = getImageData(image);
  return {
    width: imageData.width,
    height: imageData.height,
  };
}

export default class ImageHelper extends ValueHelper<ImageHelperValue> {
  default = { ...DEFAULT }

  private onInput(setImg: (src: string | null) => void, setProgress: (pct: number) => void, evt: Event) {
    setProgress(0);
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
      setImg(src);
      for await (const progress of ValueHelper.emitFile(file, file.name)) {
        switch (progress.status) {
          case 'pending': setProgress(progress.progress); break;
          case 'error': setProgress(0); setImg(null); break;
          case 'success': {
            const src = progress.url;
            const meta = await fetchImageMeta(this.getRealUrl(src));
            setProgress(100);
            setImg(null);
            this.update({
                type: ImageType.PNG,
                aspectRatio: meta.width / meta.height,
                src,
                focus: Focus.stamp(),
                ...meta,
            });
            break;
          }
        }
      }
    };
    reader.readAsDataURL(file);
  }

  private async onSave(data: string) {
    for await (const progress of ValueHelper.emitFile(data, 'image/png', '')) {
        switch (progress.status) {
            case 'pending': break;
            case 'error': break;
            case 'success': {
                const src = progress.url;
                const meta = await fetchImageMeta(this.getRealUrl(src));
                this.update({
                    type: ImageType.PNG,
                    aspectRatio: meta.width / meta.height,
                    src,
                    focus: Focus.stamp(),
                    ...meta,
                });
                break;
            }
        }
    }
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
    const img = useRef<HTMLImageElement>(null);
    const value = useRef<ImageHelperValue>(update);
    const directiveRef = useRef<ImageHelper>(directive);
    directiveRef.current = directive;
    value.current = JSON.parse(JSON.stringify(update));
    const src = this.getRealUrl(value.current.src);
    value.current.src && console.log('IMG', src, value.current.src);
    const hasSrc = src !== TRANSPARENT_PIXEL;
    const [ progress, setProgress ] = useState(0);
    const [ tmpImg, setTmpImg ] = useState<string | null>(null);

    useLayoutEffect(() => {
      if (!img.current) { return; }
      const picker = new FocusPicker(img.current, {
        onChange: (focus: FocusState) => {
          const prev = value.current.focus;
          if (prev.blurhash === undefined) { prev.blurhash = null; }
          if (focus.blurhash === undefined) { focus.blurhash = null; }
          if (jsonStringify(prev) === jsonStringify(focus)) { return; }
          directiveRef.current.update({ ...value.current, focus });
        },
      });
      hasSrc ? picker.enable() : picker.disable();
      return () => picker.disable();
    }, [ img.current, hasSrc ]);

    return <div class="previewable">
      {(progress !== 0 && progress !== 100) ? <progress class="image-directive__progress" min="0" max="100" value={progress}> {progress}% </progress> : null}
      {src === TRANSPARENT_PIXEL ? <input type="file" name={name} accept="image/*" aria-describedby={`help-${name}`} onInput={directive.onInput.bind(directive, setTmpImg, setProgress)} /> : null}
      <input type="hidden" name={`${name}[src]`} value={value.current?.src || ''} aria-describedby={`help-${name}`} />
      <div class={`preview ${src === TRANSPARENT_PIXEL && !tmpImg ? 'image-directive__empty-preview' : ''}`} >
        <img
          src={src === TRANSPARENT_PIXEL ? (tmpImg || TRANSPARENT_PIXEL) : src}
          id={name}
          data-focus-picker={true}
          data-focus-x={value.current?.focus?.x || 0} 
          data-focus-y={value.current?.focus?.y || 0}
          data-focus-fit={value.current?.focus?.fit || 0}
          ref={img}
        />
      </div>
      {hasSrc ? <button class="remove-image-button" onClick={(evt) => { evt.preventDefault(); directive.update({ ...DEFAULT }); }}>Remove</button> : null}
      {hasSrc ? <button class="edit-image-button" data-name={name} onClick={async(evt) => {
        evt.preventDefault();
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
      ...DEFAULT,
      ...value,
      focus: {
        ...value.focus,
        toString() {
          return value.focus ? Focus.encode(value.focus) : '';
        },
      },
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
        function _arrayLikeToArray(arr, len) {
            if (len == null || len > arr.length) len = arr.length;
            for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
            return arr2;
        }
        function _arrayWithHoles(arr) {
            if (Array.isArray(arr)) return arr;
        }
        function _defineProperty(obj, key, value) {
            if (key in obj) {
                Object.defineProperty(obj, key, {
                    value: value,
                    enumerable: true,
                    configurable: true,
                    writable: true
                });
            } else {
                obj[key] = value;
            }
            return obj;
        }
        function _iterableToArrayLimit(arr, i) {
            var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
            if (_i == null) return;
            var _arr = [];
            var _n = true;
            var _d = false;
            var _s, _e;
            try {
                for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
                    _arr.push(_s.value);
                    if (i && _arr.length === i) break;
                }
            } catch (err) {
                _d = true;
                _e = err;
            } finally{
                try {
                    if (!_n && _i["return"] != null) _i["return"]();
                } finally{
                    if (_d) throw _e;
                }
            }
            return _arr;
        }
        function _nonIterableRest() {
            throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
        }
        function _objectSpread(target) {
            for(var i = 1; i < arguments.length; i++){
                var source = arguments[i] != null ? arguments[i] : {};
                var ownKeys = Object.keys(source);
                if (typeof Object.getOwnPropertySymbols === "function") {
                    ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                        return Object.getOwnPropertyDescriptor(source, sym).enumerable;
                    }));
                }
                ownKeys.forEach(function(key) {
                    _defineProperty(target, key, source[key]);
                });
            }
            return target;
        }
        function _slicedToArray(arr, i) {
            return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
        }
        function _unsupportedIterableToArray(o, minLen) {
            if (!o) return;
            if (typeof o === "string") return _arrayLikeToArray(o, minLen);
            var n = Object.prototype.toString.call(o).slice(8, -1);
            if (n === "Object" && o.constructor) n = o.constructor.name;
            if (n === "Map" || n === "Set") return Array.from(n);
            if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
        }
        var __defProp = Object.defineProperty;
        var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames = Object.getOwnPropertyNames;
        var __hasOwnProp = Object.prototype.hasOwnProperty;
        var __export = function(target, all) {
            for(var name in all)__defProp(target, name, {
                get: all[name],
                enumerable: true
            });
        };
        var __copyProps = function(to, from, except, desc) {
            if (from && typeof from === "object" || typeof from === "function") {
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    var _loop = function() {
                        var key = _step.value;
                        if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
                            get: function() {
                                return from[key];
                            },
                            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
                        });
                    };
                    for(var _iterator = __getOwnPropNames(from)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true)_loop();
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
            return to;
        };
        var __toCommonJS = function(mod) {
            return __copyProps(__defProp({}, "__esModule", {
                value: true
            }), mod);
        };
        // src/runtime.ts
        var runtime_exports = {};
        __export(runtime_exports, {
            decode: function() {
                return decode;
            },
            encode: function() {
                return encode;
            },
            stamp: function() {
                return stamp;
            },
            watch: function() {
                return watch;
            }
        });
        module.exports = __toCommonJS(runtime_exports);
        // src/decodeBlurHash.ts
        var digit = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
        var decode83 = function(str, start, end) {
            var value = 0;
            while(start < end){
                value *= 83;
                value += digit.indexOf(str[start++]);
            }
            return value;
        };
        var pow = Math.pow;
        var PI = Math.PI;
        var PI2 = PI * 2;
        var d = 3294.6;
        var e = 269.025;
        var sRGBToLinear = function(value) {
            return value > 10.31475 ? pow(value / e + 0.052132, 2.4) : value / d;
        };
        var linearTosRGB = function(v) {
            return ~~(v > 1227e-8 ? e * pow(v, 0.416666) - 13.025 : v * d + 1);
        };
        var signSqr = function(x) {
            return (x < 0 ? -1 : 1) * x * x;
        };
        var fastCos = function(x) {
            x += PI / 2;
            while(x > PI){
                x -= PI2;
            }
            var cos = 1.27323954 * x - 0.405284735 * signSqr(x);
            return 0.225 * (signSqr(cos) - cos) + cos;
        };
        function decodeBlurHash(blurHash, width, height, punch) {
            var sizeFlag = decode83(blurHash, 0, 1);
            var numX = sizeFlag % 9 + 1;
            var numY = ~~(sizeFlag / 9) + 1;
            var size = numX * numY;
            var maximumValue = (decode83(blurHash, 1, 2) + 1) / 13446 * (punch | 1);
            var colors = new Float64Array(size * 3);
            var value = decode83(blurHash, 2, 6);
            colors[0] = sRGBToLinear(value >> 16);
            colors[1] = sRGBToLinear(value >> 8 & 255);
            colors[2] = sRGBToLinear(value & 255);
            var i = 0, j = 0, x = 0, y = 0, r = 0, g = 0, b = 0, basis = 0, basisY = 0, colorIndex = 0, pixelIndex = 0, yh = 0, xw = 0;
            for(i = 1; i < size; i++){
                value = decode83(blurHash, 4 + i * 2, 6 + i * 2);
                colors[i * 3] = signSqr(~~(value / (19 * 19)) - 9) * maximumValue;
                colors[i * 3 + 1] = signSqr(~~(value / 19) % 19 - 9) * maximumValue;
                colors[i * 3 + 2] = signSqr(value % 19 - 9) * maximumValue;
            }
            var bytesPerRow = width * 4;
            var pixels = new Uint8ClampedArray(bytesPerRow * height);
            for(y = 0; y < height; y++){
                yh = PI * y / height;
                for(x = 0; x < width; x++){
                    r = 0;
                    g = 0;
                    b = 0;
                    xw = PI * x / width;
                    for(j = 0; j < numY; j++){
                        basisY = fastCos(yh * j);
                        for(i = 0; i < numX; i++){
                            basis = fastCos(xw * i) * basisY;
                            colorIndex = (i + j * numX) * 3;
                            r += colors[colorIndex] * basis;
                            g += colors[colorIndex + 1] * basis;
                            b += colors[colorIndex + 2] * basis;
                        }
                    }
                    pixelIndex = 4 * x + y * bytesPerRow;
                    pixels[pixelIndex] = linearTosRGB(r);
                    pixels[pixelIndex + 1] = linearTosRGB(g);
                    pixels[pixelIndex + 2] = linearTosRGB(b);
                    pixels[pixelIndex + 3] = 255;
                }
            }
            return pixels;
        }
        var decodeBlurHash_default = decodeBlurHash;
        // src/runtime.ts
        var DATA_ATTR = "data-focus";
        var TRANSITION_DURATION = 320;
        var TRANSITION_DELAY = 280;
        var QUERY_SELECTOR = "img[".concat(DATA_ATTR, "]");
        var TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        function decode(data) {
            var _ref = _slicedToArray(JSON.parse(atob(data)) || [], 7), version = _ref[0], x = _ref[1], y = _ref[2], width = _ref[3], height = _ref[4], fit = _ref[5], blurhash = _ref[6];
            if (version !== 1) {
                throw new Error("Unknown focus encoding version.");
            }
            return {
                x: x / 100 || 0,
                y: y / 100 || 0,
                width: width || 0,
                height: height || 0,
                fit: fit === 0 ? "contain" : "cover",
                blurhash: blurhash || null
            };
        }
        function encode(focus) {
            var version = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
            if (version !== 1) {
                throw new Error("Unknown focus encoding version.");
            }
            return btoa(JSON.stringify([
                version,
                Math.round(focus.x * 100),
                Math.round(focus.y * 100),
                focus.width,
                focus.height,
                focus.fit === "cover" ? 1 : 0,
                focus.blurhash
            ])).replaceAll("=", "");
        }
        function stamp() {
            var focus = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            return _objectSpread({
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                fit: "cover",
                blurhash: null
            }, focus);
        }
        function getBlurHashBackground(canvas2, focus) {
            if (!focus.blurhash) {
                return "url(".concat(TRANSPARENT_PIXEL, ")");
            }
            var ctx = canvas2.getContext("2d");
            var blurhash = focus.blurhash;
            var imageW = focus.width;
            var imageH = focus.height;
            var smallW = imageW > imageH ? 100 : Math.round(100 * (imageW / imageH));
            var smallH = imageH > imageW ? 100 : Math.round(100 * (imageH / imageW));
            var pixels = decodeBlurHash_default(blurhash, smallW, smallH);
            ctx.clearRect(0, 0, canvas2.width, canvas2.height);
            canvas2.width = smallW;
            canvas2.height = smallH;
            var imageData = ctx.createImageData(smallW, smallH);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
            return 'url("'.concat(canvas2.toDataURL("image/jpeg"), '")');
        }
        function calcShift(containerSize, imageSize, focusSize, toMinus) {
            var res = 50 * focusSize + 1 / ((imageSize - containerSize) / containerSize) * 50 * focusSize;
            return Math.min(Math.max(50 + (toMinus ? -1 : 1) * res, 0), 100);
        }
        var canvas = null;
        function applyShift(img, elementW, elementH) {
            if (img.__FOCUS_PICKER__) {
                return;
            }
            var focus = decode(img.getAttribute(DATA_ATTR));
            canvas = canvas || document.createElement("canvas");
            var imageW = focus.width;
            var imageH = focus.height;
            if (!(elementW > 0 && elementH > 0 && imageW > 0 && imageH > 0)) {
                return false;
            }
            var wR = imageW / elementW;
            var hR = imageH / elementH;
            var hShift = 50;
            var vShift = 50;
            if (focus.fit === "cover") {
                if (wR > hR) {
                    hShift = calcShift(elementW, imageW / hR, focus.x);
                } else if (wR < hR) {
                    vShift = calcShift(elementH, imageH / wR, focus.y, true);
                }
            } else if (wR < hR) {
                hShift = focus.x * 50 + 50;
            } else if (wR > hR) {
                vShift = 100 - (focus.y * 50 + 50);
            }
            var loadingState = img.style.getPropertyValue("--loading") || null;
            img.style.objectFit = focus.fit;
            img.style.transition = "background-image ".concat(TRANSITION_DURATION, "ms ease-in-out ").concat(TRANSITION_DELAY, "ms");
            img.style.backgroundPosition = "".concat(hShift, "% ").concat(vShift, "%");
            img.style.backgroundSize = focus.fit;
            img.style.objectFit = focus.fit;
            img.style.backgroundRepeat = "no-repeat";
            if (img.src !== img.style.getPropertyValue("--src").slice(1, -1)) {
                img.style.setProperty("--src", '"'.concat(img.src, '"'));
                img.style.setProperty("--loading", "");
                img.style.setProperty("--blurhash", "");
                loadingState = null;
            }
            if (!loadingState) {
                img.style.objectPosition = "-1000vw";
                img.style.setProperty("--loading", loadingState = "loading" /* LOADING */ );
            }
            if (img.style.getPropertyValue("--blurhash").slice(1, -1) !== focus.blurhash && loadingState !== "complete" /* COMPLETE */ ) {
                img.style.setProperty("--blurhash", '"'.concat(focus.blurhash, '"'));
                img.style.backgroundImage = getBlurHashBackground(canvas, focus);
            }
            if (img.complete && loadingState === "loading" /* LOADING */ ) {
                img.style.setProperty("--loading", "transitioning" /* TRANSITIONING */ );
                setTimeout(function() {
                    img.style.backgroundImage = 'url("'.concat(img.src, '")');
                    setTimeout(function() {
                        img.style.setProperty("--loading", "complete" /* COMPLETE */ );
                        img.style.objectPosition = "".concat(hShift, "% ").concat(vShift, "%");
                        img.style.backgroundImage = "";
                    }, TRANSITION_DURATION + TRANSITION_DELAY + 10);
                }, 10);
            } else if (loadingState === "complete" /* COMPLETE */ ) {
                img.style.objectPosition = "".concat(hShift, "% ").concat(vShift, "%");
            }
        }
        function applyToImg(img) {
            var _img_getBoundingClientRect = img.getBoundingClientRect(), width = _img_getBoundingClientRect.width, height = _img_getBoundingClientRect.height;
            applyShift(img, width, height);
        }
        function applyToEvent(evt) {
            applyToImg(evt.target);
        }
        var observing = /* @__PURE__ */ new WeakSet();
        var resizeObserver = globalThis.ResizeObserver ? new ResizeObserver(function(entries) {
            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
            try {
                for(var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                    var entry = _step.value;
                    var img = entry.target;
                    var _entry_borderBoxSize_ = entry.borderBoxSize[0], width = _entry_borderBoxSize_.inlineSize, height = _entry_borderBoxSize_.blockSize;
                    applyShift(img, width, height);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally{
                try {
                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                        _iterator.return();
                    }
                } finally{
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }) : null;
        var mutationObserver = globalThis.MutationObserver ? new MutationObserver(function(entries) {
            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
            try {
                for(var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                    var entry = _step.value;
                    switch(entry.type){
                        case "childList":
                            {
                                var _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                                try {
                                    for(var _iterator1 = Array.from(entry.removedNodes)[Symbol.iterator](), _step1; !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                        var el = _step1.value;
                                        var _el_matches;
                                        if (!el || !(el === null || el === void 0 ? void 0 : (_el_matches = el.matches) === null || _el_matches === void 0 ? void 0 : _el_matches.call(el, QUERY_SELECTOR)) || observing.has(el)) {
                                            continue;
                                        }
                                        observing.delete(el);
                                        resizeObserver === null || resizeObserver === void 0 ? void 0 : resizeObserver.unobserve(el);
                                        el.removeEventListener("load", applyToEvent);
                                    }
                                } catch (err) {
                                    _didIteratorError1 = true;
                                    _iteratorError1 = err;
                                } finally{
                                    try {
                                        if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                                            _iterator1.return();
                                        }
                                    } finally{
                                        if (_didIteratorError1) {
                                            throw _iteratorError1;
                                        }
                                    }
                                }
                                var _iteratorNormalCompletion2 = true, _didIteratorError2 = false, _iteratorError2 = undefined;
                                try {
                                    for(var _iterator2 = Array.from(entry.addedNodes)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true){
                                        var el1 = _step2.value;
                                        var _el_matches1;
                                        if (!el1 || !(el1 === null || el1 === void 0 ? void 0 : (_el_matches1 = el1.matches) === null || _el_matches1 === void 0 ? void 0 : _el_matches1.call(el1, QUERY_SELECTOR)) || observing.has(el1)) {
                                            continue;
                                        }
                                        observing.add(el1);
                                        resizeObserver === null || resizeObserver === void 0 ? void 0 : resizeObserver.observe(el1);
                                        el1.addEventListener("load", applyToEvent);
                                        applyToImg(el1);
                                    }
                                } catch (err) {
                                    _didIteratorError2 = true;
                                    _iteratorError2 = err;
                                } finally{
                                    try {
                                        if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                                            _iterator2.return();
                                        }
                                    } finally{
                                        if (_didIteratorError2) {
                                            throw _iteratorError2;
                                        }
                                    }
                                }
                                break;
                            }
                        case "attributes":
                            {
                                var _el_matches2;
                                var el2 = entry.target;
                                if (!(el2 === null || el2 === void 0 ? void 0 : (_el_matches2 = el2.matches) === null || _el_matches2 === void 0 ? void 0 : _el_matches2.call(el2, QUERY_SELECTOR))) {
                                    continue;
                                }
                                applyToImg(el2);
                                if (observing.has(el2)) {
                                    continue;
                                }
                                observing.add(el2);
                                resizeObserver === null || resizeObserver === void 0 ? void 0 : resizeObserver.observe(el2);
                                el2.addEventListener("load", applyToEvent);
                                break;
                            }
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally{
                try {
                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                        _iterator.return();
                    }
                } finally{
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }) : null;
        function run() {
            mutationObserver === null || mutationObserver === void 0 ? void 0 : mutationObserver.observe(document.body, {
                subtree: true,
                childList: true,
                attributeFilter: [
                    DATA_ATTR,
                    "src"
                ]
            });
            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
            try {
                for(var _iterator = Array.from(document.querySelectorAll(QUERY_SELECTOR))[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                    var img = _step.value;
                    if (img.__FOCUS_PICKER__ || img.tagName !== "IMG") {
                        continue;
                    }
                    img.style.objectPosition = "-1000vw";
                    img.style.setProperty("--loading", "loading" /* LOADING */ );
                    if (observing.has(img)) {
                        continue;
                    }
                    observing.add(img);
                    resizeObserver.observe(img);
                    img.addEventListener("load", applyToEvent);
                    applyToImg(img);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally{
                try {
                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                        _iterator.return();
                    }
                } finally{
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
        function watch() {
            document.readyState === "complete" || document.readyState === "interactive" ? run() : document.addEventListener("DOMContentLoaded", run);
        }
        try {
            var style = document.createElement("style");
            style.id = "image-focus";
            style.innerHTML = "img[".concat(DATA_ATTR, "] { object-position: -1000vw; }");
            document.head.appendChild(style);
        } catch (e1) {
            1;
        }
        watch();
      </script>
    `);
  }
}
