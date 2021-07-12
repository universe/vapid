/* global document, window */
import ace from 'ace-builds';

document.addEventListener("turbolinks:load", () => {
  // Ace Editor
  Array.from(document.querySelectorAll('.ace_editor')).forEach((container: Element) => {
    const textarea = container.nextElementSibling as HTMLTextAreaElement;
    const editor = ace.edit(container);

    editor.getSession().setUseWrapMode(true);
    editor.getSession().setValue(textarea.value);

    editor.getSession().on('tokenizerUpdate', () => {
      textarea.value = editor.getSession().getValue();
    });
  });
});
