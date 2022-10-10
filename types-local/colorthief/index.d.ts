export type RGBColor = [number, number, number];
export default class ColorTheif {
  getColor(image: HTMLImageElement, quality?: number): RGBColor;
  getPalette(image: HTMLImageElement, colorCount?: number, quality?: number): RGBColor[];
};
