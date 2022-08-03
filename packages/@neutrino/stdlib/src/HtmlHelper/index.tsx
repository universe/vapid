import { DirectiveProps, SafeString,ValueHelper } from '@neutrino/core';
import { useEffect, useRef, useState } from 'preact/hooks';
import sanitizeHtml from 'sanitize-html';

import type { Quill } from './editor.js';

/* eslint-disable max-len */
const ICONS = {
  hr: <svg width="25px" height="25px"><g fill-rule="evenodd"><path d="M8.45 12H5.3c-.247 0-.45.224-.45.5 0 .274.203.5.45.5h5.4c.247 0 .45-.226.45-.5 0-.276-.203-.5-.45-.5H8.45z" /><path d="M17.45 12H14.3c-.247 0-.45.224-.45.5 0 .274.203.5.45.5h5.4c.248 0 .45-.226.45-.5 0-.276-.202-.5-.45-.5h-2.25z" /></g></svg>,
  img: <svg width="25px" height="25px"><g fill-rule="evenodd"><path d="M4.042 17.05V8.857c0-1.088.842-1.85 1.935-1.85H8.43C8.867 6.262 9.243 5 9.6 5.01L15.405 5c.303 0 .755 1.322 1.177 2 0 .077 2.493 0 2.493 0 1.094 0 1.967.763 1.967 1.85v8.194c-.002 1.09-.873 1.943-1.967 1.943H5.977c-1.093.007-1.935-.85-1.935-1.937zm2.173-9.046c-.626 0-1.173.547-1.173 1.173v7.686c0 .625.547 1.146 1.173 1.146h12.683c.625 0 1.144-.53 1.144-1.15V9.173c0-.626-.52-1.173-1.144-1.173h-3.025c-.24-.63-.73-1.92-.873-2 0 0-5.052.006-5 0-.212.106-.87 2-.87 2l-2.915.003z" /><path d="M12.484 15.977a3.474 3.474 0 0 1-3.488-3.49A3.473 3.473 0 0 1 12.484 9a3.474 3.474 0 0 1 3.488 3.488c0 1.94-1.55 3.49-3.488 3.49zm0-6.08c-1.407 0-2.59 1.183-2.59 2.59 0 1.408 1.183 2.593 2.59 2.593 1.407 0 2.59-1.185 2.59-2.592 0-1.406-1.183-2.592-2.59-2.592z" /></g></svg>,
  btn: <svg width="25px" height="25px">
    <path className="st0" d="M16.6,6c2.5,0,4.5,0,4.5,0c1.1,0,2,0.8,2,1.9V18c0,1.1-0.9,1.9-2,1.9H4C2.9,20,2,19.1,2,18V7.9C2,6.8,2.9,6,4,6h4.5 M9.1,7L4.2,7l0,0C3.6,7,3,7.6,3,8.2v9.7C3,18.5,3.6,19,4.2,19h16.7c0.6,0,1.1-0.5,1.1-1.1V8.2C22,7.5,21.5,7,20.9,7h-5" />
    <path d="M6.4,10.1h2.3c0.5,0,0.8,0,1,0.1s0.4,0.1,0.6,0.2s0.3,0.3,0.4,0.5c0.1,0.2,0.2,0.4,0.2,0.7c0,0.3-0.1,0.5-0.2,0.7c-0.1,0.2-0.3,0.4-0.6,0.5c0.3,0.1,0.6,0.3,0.8,0.5c0.2,0.2,0.3,0.5,0.3,0.9c0,0.3-0.1,0.5-0.2,0.8s-0.3,0.4-0.5,0.6c-0.2,0.1-0.5,0.2-0.8,0.3c-0.2,0-0.7,0-1.4,0H6.4V10.1z M7.6,11v1.3h0.8c0.5,0,0.7,0,0.8,0c0.2,0,0.4-0.1,0.5-0.2s0.2-0.3,0.2-0.4c0-0.2,0-0.3-0.1-0.4s-0.2-0.2-0.4-0.2c-0.1,0-0.4,0-1,0H7.6z M7.6,13.3v1.5h1.1c0.4,0,0.7,0,0.8,0c0.2,0,0.3-0.1,0.4-0.2s0.2-0.3,0.2-0.5c0-0.2,0-0.3-0.1-0.4c-0.1-0.1-0.2-0.2-0.4-0.3s-0.5-0.1-1-0.1H7.6z" />
    <path d="M14.1,11.7v0.9h-0.8v1.7c0,0.3,0,0.5,0,0.6c0,0.1,0,0.1,0.1,0.1c0.1,0,0.1,0.1,0.2,0.1c0.1,0,0.2,0,0.4-0.1l0.1,0.9c-0.3,0.1-0.5,0.2-0.9,0.2c-0.2,0-0.4,0-0.5-0.1s-0.3-0.2-0.3-0.3s-0.1-0.2-0.2-0.4c0-0.1,0-0.4,0-0.8v-1.8h-0.5v-0.9h0.5v-0.8l1.1-0.6v1.5H14.1z" />
    <path d="M18.6,15.8h-1.1v-2.1c0-0.4,0-0.7-0.1-0.9c0-0.1-0.1-0.2-0.2-0.3s-0.2-0.1-0.4-0.1c-0.2,0-0.4,0.1-0.5,0.2S16.1,12.8,16,13c-0.1,0.2-0.1,0.5-0.1,1v1.9h-1.1v-4.1h1v0.6c0.4-0.5,0.8-0.7,1.4-0.7c0.2,0,0.5,0,0.7,0.1s0.4,0.2,0.5,0.3s0.2,0.3,0.2,0.5s0.1,0.4,0.1,0.7V15.8z" />
  </svg>,
  vid: <svg width="25px" height="25px">
    <path d="M16.8,7.5v10.1c0,1.1-0.9,1.9-2,1.9l-9.7-0.1c-1.1,0.1-2-0.8-2-1.9V7.4c0-1.1,0.9-1.9,2-1.9h4.6c2.5,0,5.1,0.1,5.1,0.1c0.8,0,1.4,0.4,1.8,1l-6.4-0.1H5.3c-0.6,0-1.2,0.6-1.2,1.2v9.7c0,0.6,0.6,1.1,1.2,1.1l9.3,0.1c0.6,0,1.1-0.5,1.1-1.1V7.8c0-0.7-0.5-1.2-1.1-1.2h2C16.7,6.8,16.8,7.2,16.8,7.5z" />
    <path d="M8.7,15.6c-0.2,0-0.4,0-0.6-0.1c-0.4-0.2-0.6-0.6-0.6-1v-3.8c0-0.4,0.2-0.8,0.6-1c0.4-0.2,0.8-0.2,1.2,0l3,1.9c0.3,0.2,0.5,0.6,0.5,1s-0.2,0.8-0.5,1l-3,1.9C9.2,15.5,8.9,15.6,8.7,15.6z M8.8,10.6l-0.1,0.1v3.8l0.1,0.1l3-1.9L12,12l-0.3,0.5L8.8,10.6z" />
    <path d="M22.1,7.6c-0.5-0.3-1.1-0.2-1.5,0l-3.8,2.4v1.3l4.4-2.8c0.1,0,0.2-0.1,0.2-0.1c0.1,0,0.2,0,0.2,0c0.1,0,0.2,0.1,0.2,0.4V16c0,0.2-0.2,0.3-0.2,0.4c-0.1,0-0.2,0.1-0.4,0l-4.4-2.8v1.3l3.8,2.4c0.2,0.2,0.5,0.2,0.8,0.2c0.2,0,0.5-0.1,0.7-0.2c0.5-0.3,0.8-0.8,0.8-1.3V9C22.9,8.4,22.6,7.9,22.1,7.6z" />
  </svg>,
};
/* eslint-enable max-len */

interface HTMLHelperOptions {
  placeholder: string;
}

export default class HTMLHelper extends ValueHelper<string, HTMLHelperOptions> {
  default = '';

  /**
   * Returns a WYSIWYG editor, depending on the options
   *
   * @param {string} name
   * @param {string} [value='']
   * @return rendered input
   */
  input({ value = this.default, directive }: DirectiveProps<string, this>) {
    const [ quill, setQuill ] = useState<Quill | null>(null);
    const editor = useRef<HTMLDivElement | null | undefined>(undefined);
    const menu = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
      (async() => {
        if (!editor.current) { return; }

        const { Quill, options } = await import('./editor');
        const newQuill = new Quill(editor.current, options, { media: directive.meta.media });
        newQuill.on('editor-change', () => {
          const $menu = menu.current;
          if (!$menu) { return true; }
          const range = newQuill.getSelection(false);
          const hasFocus = editor.current?.querySelector(':focus-within');
          if (!range || !hasFocus) {
            $menu.classList.toggle('visible', false);
            return true;
          }
          const [blot] = newQuill.getLine(range.index);
          let showMenu = !blot.domNode.innerText.trim().length;
          if (blot.isBlock) { showMenu = false; }
          $menu.classList.toggle('visible', showMenu);
          if (showMenu) {
            $menu.style.top = `${blot.domNode.getBoundingClientRect().y - (editor.current?.getBoundingClientRect()?.y || 0) - 2}px`;
          }
          return true;
        });

        let pending: number | null = null;
        let prev = '';
        let isFirst = true;
        newQuill.on('editor-change', () => {
          const $editor = editor?.current;
          if (isFirst) { return isFirst = false; }
          if (!$editor) { return; }
          pending = pending || requestAnimationFrame(() => {
            pending = null;
            const $arrow = editor?.current?.querySelector('.ql-tooltip-arrow') as HTMLElement | undefined;
            const $tooltip = editor?.current?.querySelector('.ql-tooltip') as HTMLElement | undefined;
            $tooltip && $arrow && ($arrow.style.transform = `translateX(${$tooltip.style.left})`);
            const update = $editor.querySelector('.ql-editor')?.innerHTML || '';
            if (prev === update) { return; }
            prev = update;
            directive.update(update === '<p><br></p>' ? '' : update);
          });
          return true;
        });
        newQuill.root.innerHTML = value;
        setQuill(newQuill);
      })();
    }, [editor.current]);

    function insert(evt: Event, obj?: { insert(quill: Quill): void; }) {
      quill && obj?.insert(quill);
      evt.stopPropagation();
      evt.preventDefault();
      return false;
    }

    /* eslint-disable max-len */
    return <>
      <ul className="wysiwyg-blocks" ref={menu as any} tabIndex={-1} onFocus={quill?.resetSelection}>
        <li><a href="#" className="wysiwyg-blocks__block wysiwyg-blocks__block--btn" onClick={(evt) =>insert(evt as unknown as Event, quill?.buttonBlot) }>Button {ICONS.btn}</a></li>
        <li><a href="#" className="wysiwyg-blocks__block wysiwyg-blocks__block--hr" onClick={(evt) => insert(evt as unknown as Event, quill?.hrBlot)}>Divider {ICONS.hr}</a></li>
        <li><a href="#" className="wysiwyg-blocks__block wysiwyg-blocks__block--img" onClick={(evt) => insert(evt as unknown as Event, quill?.imgBlot)}>Image {ICONS.img}</a></li>
        <li><a href="#" className="wysiwyg-blocks__block wysiwyg-blocks__block--video" onClick={(evt) => insert(evt as unknown as Event, quill?.videoBlot)}>Video {ICONS.vid}</a></li>
      </ul>
      <div className="wysiwyg" ref={editor as any} />
    </>;
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
