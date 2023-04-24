import '@universe/wysiwyg/styles/editor.css';

import { DirectiveProps, SafeString, ValueHelper } from '@neutrino/core';
import { options,Quill } from '@universe/wysiwyg';
// import { Helper } from '@neutrino/core';
// import type { Quill } from '@universe/wysiwyg';
import { useEffect, useRef } from 'preact/hooks';
import sanitizeHtml from 'sanitize-html';

interface HTMLHelperOptions {
  placeholder: string;
}

export default class HTMLHelper extends ValueHelper<string, HTMLHelperOptions> {
  default = '';

  private quill: Quill | null = null;
  private prev = '';
  private pendingReset: number | null = null;
  // private editor: HTMLDivElement | null = null;
  // private menu: HTMLUListElement | null = null;

  /**
   * Returns a WYSIWYG editor, depending on the options
   *
   * @param {string} name
   * @param {string} [value='']
   * @return rendered input
   */
  input({ value = this.default, directive }: DirectiveProps<string, this>) {
    const editor = useRef<HTMLDivElement | null | undefined>(undefined);
    const menu = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
      (async() => {
        if (!editor.current) { return; }
        directive.prev = value;
        editor.current.innerHTML = '';
        directive.quill = new Quill(editor.current, options, { media: directive.meta.media, onFileUpload: ValueHelper.emitFile });
        directive.quill.pasteHTML(directive.prev);
        directive.quill.on('editor-change', () => {
          const $menu = menu.current;
          if (!$menu) { return true; }
          const range = directive.quill!.getSelection(false);
          const hasFocus = editor.current?.querySelector(':focus-within');
          if (!range || !hasFocus) {
            $menu.classList.toggle('visible', false);
            return true;
          }
          const [blot] = directive.quill!.getLine(range.index);
          let showMenu = !blot.domNode.innerText.trim().length;
          if (blot.isBlock) { showMenu = false; }
          $menu.classList.toggle('visible', showMenu);
          if (showMenu) {
            $menu.style.top = `${blot.domNode.getBoundingClientRect().y - (editor.current?.getBoundingClientRect()?.y || 0) - 2}px`;
          }
          return true;
        });

        let pending: number | null = null;
        let isFirst = true;
        directive.quill.on('editor-change', () => {
          const $editor = editor?.current;
          if (isFirst) { return isFirst = false; }
          if (!$editor) { return; }
          pending = pending || requestAnimationFrame(() => {
            pending = null;
            const $arrow = editor?.current?.querySelector('.ql-tooltip-arrow') as HTMLElement | undefined;
            const $tooltip = editor?.current?.querySelector('.ql-tooltip') as HTMLElement | undefined;
            $tooltip && $arrow && ($arrow.style.transform = `translateX(${$tooltip.style.left})`);
            const update = $editor.querySelector('.ql-editor')?.innerHTML || '';
            if (directive.prev === update) { return; }
            directive.prev = update;
            directive.update(update === '<p><br></p>' ? '' : update);
          });
          return true;
        });
        directive.quill?.enable();
      })();
    }, [editor.current]);

    // When we receive a new value, if we weren't the ones to set it, update our current state to reflect.
    useEffect(() => {
      if (directive.prev === value) { return; }
      if (directive.pendingReset) { cancelAnimationFrame(directive.pendingReset); }
      directive.pendingReset = requestAnimationFrame(() => {
        if (directive.quill?.root?.contains(document.activeElement)) { return; }
        directive.quill?.disable(); // To prevent auto focus on HTML paste.
        directive.quill?.clipboard.dangerouslyPasteHTML(value);
        directive.quill?.enable();
      });
    }, [value]);

    /* eslint-disable max-len */
    return <div onClick={evt => { evt.stopImmediatePropagation(); evt.preventDefault(); }}>
      <div className="wysiwyg wysiwyg--minor-third" ref={editor as any} />
    </div>;
    /* eslint-enable max-len */
  }

  /**
   * Renders HTML
   * Allows Markdown if given the option
   *
   * @param {string} value
   * @return {string} rendered HTML
   */
  async data(value = this.default) {
    return new SafeString((value || '').replace('<p><br></p>', ''));
  }

  /**
   * Strips HTML out for simple preview
   *
   * @param {string} value
   * @return {string} plain text
   */
  preview(value = '') {
    const dirty: string = value.replace('<p><br></p>', '');
    return sanitizeHtml(dirty, { allowedTags: [] });
  }

  inject() {
    return new SafeString(`
      <style>
        .quill-button *:not(.quill-button__text) { display: none !important; }
        .quill-image input, .quill-image nav, .quill-image textarea { display: none !important; }
        .quill-video input, .quill-video nav, .quill-video textarea { display: none !important; }
      </style>
    `);
  }
}
