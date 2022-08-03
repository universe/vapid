
import { Helper } from '@neutrino/core';
import Quill, { QuillOptionsStatic } from 'quill';
import { QuillButton, QuillButtonBindings } from 'quill-button';
import { QuillHr, QuillHrBindings } from 'quill-hr';
import { QuillImage, QuillImageBindings } from 'quill-image';
import { QuillVideo, QuillVideoBindings } from 'quill-video-embed';

let prefix = '';
const imgBlot = new QuillImage(Quill, {
  handler: async(id: string, base64: string, type?: string) => {
    const data = await Helper.emitFile(id, base64, type);
    return `${prefix}/${data.file.src}`;
  },
});
const hrBlot = new QuillHr(Quill);
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
      [{ header: [ 1, 2, 3, 4, 5, 6, false ] }],
      [{ color: [
        'var(--primary-1)', 'var(--cta-1)','var(--gray-1)', undefined, undefined, undefined, undefined,
        'var(--primary-5)', 'var(--cta-5)', 'var(--gray-5)', undefined, undefined, undefined, undefined,
        'var(--primary-9)', 'var(--cta-9)', 'var(--gray-9)', undefined, undefined, undefined, undefined,
      ] }, 'bold', 'italic', 'underline' ],
      [ 'link', 'blockquote', 'code-block' ],
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

class UniverseQuill extends Quill {
  constructor(root: Element, options: QuillOptionsStatic, universeOptions: { media: string; }) {
    super(root, options);
    prefix = universeOptions.media;
    this.resetSelection = this.resetSelection.bind(this);
  }
  hrBlot = hrBlot;
  imgBlot = imgBlot;
  buttonBlot = buttonBlot;
  videoBlot = videoBlot;
  resetSelection() {
    const range = this?.getSelection(false);
    range && this?.setSelection(range.index, range.length, Quill?.sources.SILENT);
  }
}

export {
  options,
  UniverseQuill as Quill,
};
