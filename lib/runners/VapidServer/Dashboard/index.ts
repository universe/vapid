/* global document, window */
import $ from 'jquery';

import Turbolinks from 'turbolinks';
Turbolinks.start();

// TODO: Include as packages
// require('../vendor/semantic-ui/semantic.min');
// require('../vendor/jquery.tablesort');

import './ace';
import './datepicker';
import './range';
import './semantic';
import './sidebar';
import './sortable';
import './websocket';
import './wysiwyg';

import imageHandler from './imageHandler';

import ImageEditor = require('tui-image-editor');

// TODO: Add instagram like filters somehow
// https://una.im/CSSgram/
// http://camanjs.com/guides/#BasicUsage
let imageEditor: ImageEditor | null = null;
async function ensureEditor(path: string) {
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

  return imageEditor;
}

async function editImage(path: string) {
  if (!path) { return; }
  const editor = await ensureEditor(path);
  editor.clearRedoStack();
  editor.clearUndoStack();
  document.getElementById('image-editor')?.classList.add('image-editor--visible');
}

// CSRF
$.ajaxSetup({
  headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
});

/* eslint-disable no-param-reassign */
const autoExpand = (field: HTMLElement) => {
  field.style.resize = 'none';
  field.style.height = 'inherit';
  const computed = window.getComputedStyle(field);
  const height = parseInt(computed.getPropertyValue('border-top-width'), 10)
    + parseInt(computed.getPropertyValue('padding-top'), 10)
    + field.scrollHeight
    + parseInt(computed.getPropertyValue('padding-bottom'), 10)
    + parseInt(computed.getPropertyValue('border-bottom-width'), 10);
  field.style.height = `${height}px`;
};

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
const rand = window.crypto.getRandomValues.bind(window.crypto);
const uuid = () => ('' + 1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (+c ^ rand(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16));

const init = () => {
  Array.from(document.querySelectorAll('textarea')).map(autoExpand);
  const settingsButton = document.getElementById('page-settings');
  settingsButton && settingsButton.addEventListener('click', () => {
    document.querySelector('.metadata')?.classList.toggle('open');
  });

  let editingName: string | null = null;
  document.body.addEventListener('click', (evt) => {
    const target = evt.target as HTMLElement;
    if (target.id !== 'edit-image-button') { return; }
    editingName = target.dataset.name || null;
    evt.stopImmediatePropagation();
    evt.preventDefault();
    editImage(target.parentElement?.querySelector('img')?.getAttribute('src') || '');
  });

  document.getElementById('image-editor-discard')?.addEventListener('click', () => {
    document.getElementById('image-editor')?.classList.remove('image-editor--visible');
  });

  document.getElementById('image-editor-save')?.addEventListener('click', async () => {
    if (!imageEditor) { return; }
    const data = imageEditor.toDataURL();
    const url = await imageHandler(uuid(), data);
    (document.querySelector(`[id="${editingName}"]`) as HTMLImageElement).src = url;
    (document.querySelector(`input[type="hidden"][name="${editingName}"]`) as HTMLInputElement).value = url.replace('/uploads/', '');
    document.getElementById('image-editor')?.classList.remove('image-editor--visible');
  });

  for (const link of Array.from(document.querySelectorAll('.field__link'))) {
    const name = link.querySelector('input[type=text]');
    const sel = link.querySelector('select');
    const url = link.querySelector('input[type=url]') as HTMLInputElement;
    if (!sel || !name || !url) { continue; }
    sel.addEventListener('change', () => {
      sel.classList.toggle('selected', !!sel.value);
      url.value = '';
      name?.setAttribute('placeholder', sel.value ? sel.selectedOptions[0].textContent || '' : '');
    });

    url.addEventListener('input', () => {
      sel.value = '';
      sel.classList.remove('selected');
      name.setAttribute('placeholder', url.value);
    });
  }


}

document.addEventListener('input', (event) => (event.target as HTMLElement).tagName.toLowerCase() === 'textarea' && autoExpand(event.target as HTMLElement), false);
document.addEventListener('input', (event) => {
  const el = event.target as HTMLInputElement;
  if (el.tagName.toLowerCase() !== 'input' || el.getAttribute('type') !== 'file') { return; }
  const reader = new FileReader();
  reader.onload = (e) => { (document.getElementById(el.name) as HTMLImageElement).src = (e.target?.result?.toString() || ''); };
  el.files && reader.readAsDataURL(el.files[0]);
}, false);
document.addEventListener('change', (event) => {
  const el = event.target as HTMLElement;
  if (el.tagName.toLowerCase() !== 'input' || el.getAttribute('type') !== 'checkbox' || !el.id.startsWith('_destroy')) { return; }
  const img = el.parentElement?.parentElement?.querySelector('img') as HTMLImageElement;
  img.src = '';
}, false);

// Checkboxes don't send a value if un-checked. Ensure we send 'false' to the server for our data model.
document.addEventListener('change', (event) => {
  const el = event.target as HTMLInputElement;
  if (el.tagName.toLowerCase() !== 'input' || el.getAttribute('type') !== 'checkbox' || !el.id.startsWith('content')) { return; }
  el.checked ? el.previousElementSibling?.setAttribute('name', '') : el.previousElementSibling?.setAttribute('name', el.getAttribute('name') || '');
}, false);

document.addEventListener('turbolinks:load', init);
