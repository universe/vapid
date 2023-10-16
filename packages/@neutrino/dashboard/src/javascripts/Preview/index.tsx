import { IRecord } from '@neutrino/core';
import { IWebsite, renderRecord } from '@neutrino/runtime';
import type { SimpleDocument } from '@simple-dom/interface';
import Spinner from '@universe/aether/components/Spinner';
import { useContext, useEffect } from 'preact/hooks';

import { WebsiteContext } from '../theme.js';
import highlight from './highlight.js';

let isFirstRender = true;
let queuedRender = 0;

interface PreviewProps {
  record: IRecord | null;
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

export default function Preview({ record }: PreviewProps) {

  const { theme, records, loading } = useContext(WebsiteContext);

  // If first render and we haven't found an AST match (e.g. loading a settings page), render the home page instead.
  useEffect(() => {
    const siteUpdate = JSON.parse(JSON.stringify(theme)) as IWebsite;
    const recordsUpdate = JSON.parse(JSON.stringify(records)) as Record<string, IRecord>;
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
      const scratchDoc = (document.getElementById('vapid-preview-scratch') as HTMLIFrameElement).contentDocument;
      if (!renderedRecord || !doc || !scratchDoc) { return; }

      // Render the site into our hidden scratch document.
      await renderRecord(false, scratchDoc as unknown as SimpleDocument, renderedRecord, siteUpdate, recordsUpdate);

      // Merge our scratch doc with our visible doc. (TODO: This can be better!)
      doc.body.replaceChildren(...Array.from((scratchDoc.body as HTMLElement).children));
      const oldList = Array.from(doc.head.children);
      const newList = Array.from(scratchDoc.head.children);
      for (let i = 0; i < Math.max(oldList.length, newList.length); i++) {
        const old: Element | undefined = oldList[i];
        const updated: Element | undefined = newList[i];
        if (!old) { doc.head.appendChild(updated); }
        else if (!updated) { doc.head.removeChild(old); }
        else if (!old.isEqualNode(updated)) { doc.head.replaceChild(updated, old); }
      }

      // If it's our first render, inject our client side preview app script.
      if (isFirstRender) {
        const script = doc.createElement('script');
        script.append(`(${highlight.toString()})()`);
        doc.head.appendChild(script);
      }
      isFirstRender = false;
    });
  }, [ theme, record, records ]);

  return <>
    <Spinner size="large" className={`vapid-preview__loading vapid-preview--${typeof loading === 'string' ? 'error' : (loading ? 'loading' : 'success')}`} />
    <iframe src="about:blank" id="vapid-preview" class="vapid-preview__iframe" sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms" />
    <iframe src="about:blank" id="vapid-preview-scratch" class="vapid-preview__scratch-iframe" sandbox="allow-same-origin allow-scripts allow-popups allow-modals allow-forms" />
  </>;
}
