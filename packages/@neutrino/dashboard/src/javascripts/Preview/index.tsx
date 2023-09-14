import { IRecord } from '@neutrino/core';
import { IWebsite, renderRecord } from '@neutrino/runtime';
import type { SimpleDocument } from '@simple-dom/interface';
import { Fragment } from 'preact';
import { useEffect } from 'preact/hooks';

import highlight from './highlight.js';

let isFirstRender = true;
let queuedRender = 0;

interface PreviewProps {
  siteData: IWebsite;
  record: IRecord | null;
  records: Record<string, IRecord>;
  templateName?: string;
  templateType?: string;
  pageId?: string;
  collectionId?: string;
}
let prevRender: IRecord | null = null;
export default function Preview({ siteData, record, records }: PreviewProps) {
  // console.log(record);
  // If first render and we haven't found an AST match (e.g. loading a settings page), render the home page instead.
  useEffect(() => {
    const siteUpdate = JSON.parse(JSON.stringify(siteData)) as IWebsite;
    const recordsUpdate = JSON.parse(JSON.stringify(records)) as Record<string, IRecord>;
    record && (recordsUpdate[record.id] = record);
    const recordsList = Object.values(recordsUpdate);
    let renderedRecord = record;
    if (!renderedRecord || (isFirstRender && !siteUpdate.hbs.pages[renderedRecord.templateId])) {
      renderedRecord = recordsList.find(r => r.templateId === 'index-page') || null;
    }
    if (!renderedRecord || !siteUpdate.hbs.pages[renderedRecord.templateId]) { 
      renderedRecord = prevRender; 
    }
    prevRender = renderedRecord;
    window.cancelAnimationFrame(queuedRender);
    queuedRender = window.requestAnimationFrame(async() => {

      // Grab out iframe documents and render into the scratch doc.
      const doc = (document.getElementById('vapid-preview') as HTMLIFrameElement).contentDocument;
      const scratchDoc = (document.getElementById('vapid-preview-scratch') as HTMLIFrameElement).contentDocument;
      if (!renderedRecord || !doc || !scratchDoc) { return; }
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
  }, [ siteData, record, records ]);

  return <Fragment />;
}
