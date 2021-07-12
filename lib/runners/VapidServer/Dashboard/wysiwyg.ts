/* globals document */
import Quill from 'quill';
import imageHandler from './imageHandler';

const { QuillImage, QuillImageBindings } = require('quill-image');
const { QuillHr, QuillHrBindings } = require('quill-hr');
const { QuillButton, QuillButtonBindings } = require('quill-button');
const { QuillVideo, QuillVideoBindings } = require('quill-video-embed');

const hrBlot = new QuillHr(Quill);
const imgBlot = new QuillImage(Quill, { handler: imageHandler });
const buttonBlot = new QuillButton(Quill, { pages: [{ name: 'Test', url: 'https://universe.app' }] });
const videoBlot = new QuillVideo(Quill, { pages: [{ }] });

const Break = Quill.import('blots/break');
const Embed = Quill.import('blots/embed');

class Linebreak extends Break {
  length() { return 1; }
  value() { return '\n'; }
  insertInto(parent: any, ref: any) {
    Embed.prototype.insertInto.call(this, parent, ref);
  }
}

Linebreak.blotName = 'linebreak';
Linebreak.tagName = 'BR';

Quill.register(Linebreak);

interface Context {
  quill: Quill;
}

const bindings = Object.assign(
  {},
  QuillImageBindings,
  QuillHrBindings,
  QuillButtonBindings,
  QuillVideoBindings,
  {
    linebreak: {
      key: 13,
      shiftKey: true,
      handler(this: Context, range: { index: number }) {
        const currentLeaf = this.quill.getLeaf(range.index)[0];
        const nextLeaf = this.quill.getLeaf(range.index + 1)[0];

        this.quill.insertEmbed(range.index, 'linebreak', true, 'user');

        // Insert a second break if:
        // At the end of the editor, OR next leaf has a different parent (<p>)
        if (nextLeaf === null || (currentLeaf.parent !== nextLeaf.parent)) {
          this.quill.insertEmbed(range.index, 'linebreak', true, 'user');
        }

        // Now that we've inserted a line break, move the cursor forward
        this.quill.setSelection(range.index + 1, 0, Quill.sources.SILENT);
      },
    },
  },
);

const options = {
  modules: {
    toolbar: [
      [{ font: [] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['link', 'blockquote', 'code-block'],
      [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }],
    ],
    clipboard: {
      matchVisual: false,
    },
    keyboard: {
      bindings,
    },
  },
  theme: 'bubble',
};

document.addEventListener('turbolinks:load', () => {
  const editors = document.querySelectorAll('.wysiwyg');

  for (const editor of Array.from(editors)) {
    const quill = new Quill(editor, options);
    const input = editor.nextElementSibling as HTMLInputElement;
    const BlockMenu = editor.previousElementSibling as HTMLElement;

    BlockMenu.addEventListener('focusin', () => {
      const range = quill.getSelection(false);
      range && quill.setSelection(range.index, range.length, Quill.sources.SILENT);
    }, true);

    /* eslint-disable no-loop-func */
    BlockMenu.querySelector('.wysiwyg-blocks__block--hr')?.addEventListener('click', (evt: Event) => {
      hrBlot.insert(quill);
      evt.stopPropagation();
      evt.preventDefault();
      return false;
    });

    BlockMenu.querySelector('.wysiwyg-blocks__block--img')?.addEventListener('click', (evt: Event) => {
      imgBlot.insert(quill);
      evt.stopPropagation();
      evt.preventDefault();
      return false;
    });

    BlockMenu.querySelector('.wysiwyg-blocks__block--btn')?.addEventListener('click', (evt: Event) => {
      buttonBlot.insert(quill);
      evt.stopPropagation();
      evt.preventDefault();
      return false;
    });

    BlockMenu.querySelector('.wysiwyg-blocks__block--video')?.addEventListener('click', (evt: Event) => {
      videoBlot.insert(quill);
      evt.stopPropagation();
      evt.preventDefault();
      return false;
    });

    quill.on('editor-change', () => {
      const range = quill.getSelection(false);
      if (range == null) return true;
      const [blot] = quill.getLine(range.index);
      let showMenu = !blot.domNode.innerText.trim().length;
      if (blot.isBlock) { showMenu = false; }
      BlockMenu.classList.toggle('visible', showMenu);
      if (showMenu) {
        BlockMenu.style.top = `${blot.domNode.getBoundingClientRect().y - editor.getBoundingClientRect().y}px`;
      }
      return true;
    });

    quill.on('text-change', () => {
      const els = Array.from(editor.querySelectorAll('[style]'));
      for (const el of els) { (el as HTMLElement).removeAttribute('style'); }
      const content = editor.querySelector('.ql-editor')?.innerHTML || '';
      input.value = content.replace(/^<p><br><\/p>/, '');
    });
  }
});
