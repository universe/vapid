declare module 'html5sortable' {
  export interface Options {
    items: string;
    handle: string;
    forcePlaceholderSize: boolean;
    connectWith: string;
    acceptFrom: string;
    placeholder: string;
    hoverClass: string;
    dropTargetContainerClass: string;
    maxItems: number;
    copy: boolean;
    orientation: 'horizontal' | 'vertical';
    containerSerializer: any;
    customDragImage: any;
  }
  export default function sortable(el: HTMLElement, opts: Partial<Options> | 'destroy' | 'disable' | 'enable' | 'serialize' = {});
}