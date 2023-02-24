import type ImageEditor from 'tui-image-editor';

// TODO: Add instagram like filters somehow
// https://una.im/CSSgram/
// http://camanjs.com/guides/#BasicUsage
let imageEditor: ImageEditor | null = null;
async function ensureEditor(path: string) {
  const { default: ImageEditor } = await import('tui-image-editor');
  if (imageEditor) {
    await imageEditor.loadImageFromURL(path, 'image');
    return imageEditor;
  }
  const container = document.getElementById('tui-image-editor');
  imageEditor = new ImageEditor(container as HTMLElement, {
    usageStatistics: false,
    includeUI: {
      loadImage: {
        path,
        name: 'blank',
      },
      menuBarPosition: 'left',
      uiSize: {
        width: 'calc(100vw - 8.4rem)',
        height: 'calc(100vh - 8.4rem)',
      },
    },
    cssMaxHeight: window.innerHeight - 160,
    cssMaxWidth: window.innerWidth - 160,
    selectionStyle: {
      cornerSize: 20,
      rotatingPointOffset: 70,
    },
  });

  document.getElementById('image-editor-discard')?.addEventListener('click', () => {
    document.getElementById('image-editor')?.classList.remove('image-editor--visible');
  });

  document.getElementById('image-editor-save')?.addEventListener('click', async() => {
    if (!imageEditor) { return; }
    onChange(imageEditor.toDataURL());
    document.getElementById('image-editor')?.classList.remove('image-editor--visible');
  });

  return imageEditor;
}

let onChange: (str: string) => void = () => void 0;
export async function editImage(path: string, callback: (str: string) => Promise<void> | void) {
  if (!path) { return; }
  const editor = await ensureEditor(path);
  editor?.clearRedoStack();
  editor?.clearUndoStack();
  document.getElementById('image-editor')?.classList.add('image-editor--visible');
  onChange = callback;
}
