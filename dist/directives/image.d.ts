import { BaseDirective } from './base';
declare const enum ImageType {
    JPEG = "jpeg",
    PNG = "png",
    SVG = "svg",
    GIF = "gif"
}
interface ImageDirectiveValue {
    src: string;
    type: ImageType;
    width: number;
    height: number;
    aspectRatio: number;
}
export default class ImageDirective extends BaseDirective<ImageDirectiveValue> {
    options: {
        default: {
            src: string;
            type: ImageType;
            width: number;
            height: number;
            aspectRatio: number;
        };
        label: string;
        help: string;
        priority: number;
    };
    attrs: {
        required: boolean;
        placeholder: string;
    };
    /**
     * Renders inputs necessary to upload, preview, and optionally remove images
     *
     * @param {string} name
     * @param {string} [value=this.options.default]
     * @return {string} rendered HTML
     *
     * eslint-disable class-methods-use-this
     */
    input(name: string, value?: {
        src: string;
        type: ImageType;
        width: number;
        height: number;
        aspectRatio: number;
    }): string;
    /**
     * Renders <img> tag or raw src
     */
    render(value: ImageDirectiveValue): Promise<{
        src: string;
        width: number | undefined;
        height: number | undefined;
        type: string | undefined;
        aspectRatio: number;
        toString(): string;
    }>;
    /**
     * A preview of the image
     *
     * @param {string} fileName
     * @return {string}
     */
    preview(value: ImageDirectiveValue): string;
}
export {};
