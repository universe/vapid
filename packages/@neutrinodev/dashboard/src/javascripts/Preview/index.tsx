import { IRecord } from '@neutrinodev/core';
import { IWebsite, renderRecord, update } from '@neutrinodev/runtime';
import type { SimpleDocument, SimpleNode } from '@simple-dom/interface';
import Spinner from '@universe/aether/components/Spinner';
import { useContext, useEffect } from 'preact/hooks';

import { DataContext } from "../Data/index.js";
import DeviceFrame from './DeviceFrame/index.js';
import highlight from './highlight.js';

let isFirstRender = true;
let queuedRender = 0;

interface PreviewProps {
  record: IRecord | null;
  frame?: boolean;
  templateName?: string;
  templateType?: string;
  pageId?: string;
  collectionId?: string;
}
let prevRender: IRecord | null = null;

function focusFieldPreview(evt: Event): void {
  let el: HTMLElement | null = (evt.type === 'mouseover' ? evt.target : document.activeElement) as HTMLElement || null;
  while (el) { if (el.dataset.field) { break; } el = el.parentElement as HTMLElement; }
  (document.getElementById('vapid-preview') as HTMLIFrameElement | undefined)?.contentWindow?.postMessage({ target: el?.dataset.field || null }, "*");
}

document.addEventListener('focusin', focusFieldPreview);
document.addEventListener('focusout', focusFieldPreview);

export default function Preview({ record, frame }: PreviewProps) {

  const { theme, records, loading } = useContext(DataContext);

  // If first render and we haven't found an AST match (e.g. loading a settings page), render the home page instead.
  useEffect(() => {
    const siteUpdate = structuredClone(theme) as IWebsite;
    const recordsUpdate = structuredClone(records) as Record<string, IRecord>;
    record && (recordsUpdate[record.id] = record);
    const recordsList = Object.values(recordsUpdate);
    let renderedRecord = record;
    if (!renderedRecord || (isFirstRender && !siteUpdate.hbs.pages[renderedRecord.templateId])) {
      renderedRecord = recordsList.find(r => r.templateId === 'index-page') || null;
    }
    if (!renderedRecord || !theme?.hbs?.pages?.[renderedRecord.templateId]) {
      renderedRecord = prevRender;
    }
    prevRender = renderedRecord;
    window.cancelAnimationFrame(queuedRender);
    queuedRender = window.requestAnimationFrame(async () => {

      // Grab our preview iframe documents.
      const doc = (document.getElementById('vapid-preview') as HTMLIFrameElement).contentDocument;
      if (!renderedRecord || !doc) { return; }

      // Render the site into our hidden scratch document.
      /* eslint-disable-next-line */
      const fragment = await renderRecord(false, doc as unknown as SimpleDocument, renderedRecord, siteUpdate, recordsUpdate) as unknown as DocumentFragment;
      if (fragment) {
        update(fragment.children[0] as unknown as SimpleNode, doc.children[0] as unknown as SimpleNode);
      }

      // If it's our first render, inject our client side preview app script.
      if (isFirstRender) {
        const script = doc.createElement('script');
        script.append(`(${highlight.toString()})()`);
        doc.head?.appendChild(script);
      }
      isFirstRender = false;
    });
  }, [ theme, record, records ]);

  return <DeviceFrame visible={frame !== false}>
    <Spinner size="large" className={`vapid-preview__loading vapid-preview--${typeof loading === 'string' ? 'error' : (loading ? 'loading' : 'success')}`} />
    <iframe src="about:blank" id="vapid-preview" class="vapid-preview__iframe" sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms" />
    { /* eslint-disable-next-line max-len */ }
    <iframe src="about:blank" id="vapid-preview-scratch" class="vapid-preview__iframe vapid-preview__iframe--scratch" sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms" />
  </DeviceFrame>;
}
