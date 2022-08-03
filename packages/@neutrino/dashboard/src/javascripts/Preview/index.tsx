import { IRecord } from '@neutrino/core';
import { IParsedTemplate, ITemplateAst, IWebsite,makePageContext, render } from '@neutrino/runtime';
import type { SimpleDocument } from '@simple-dom/interface';
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';

let isFirstRender = true;
let queuedRender = 0;

interface PreviewProps {
  siteData: IWebsite;
  record: IRecord | null;
  templateName?: string;
  templateType?: string;
  pageId?: string;
  collectionId?: string;
}

export default function Preview({ siteData, record }: PreviewProps) {
  const [ renderedAst, setRenderedAst ] = useState<ITemplateAst | null>(null);
  const [ renderedRecord, setRenderedRecord ] = useState<IRecord | null>(null);

  useEffect(() => {
    const records = Object.values(siteData.records);
    let ast = record ? siteData.hbs.pages[record.templateId] : null;
    if (!record || (isFirstRender && !ast)) {
      record = records.find(r => r.templateId === 'index-page') || null;
      ast = siteData.hbs.pages['index-page'];
    }
    if (!ast) { return; }
    setRenderedAst(ast);
    setRenderedRecord(record);
  }, [record]);

  // If first render and we haven't found an AST match (e.g. loading a settings page), render the home page instead.
  useEffect(() => {
    if (!renderedRecord || !renderedAst) { return; }
    const localRecords = { ...siteData.records };
    if (record?.id) { localRecords[record.id] = record; }
    const records = Object.values(localRecords);

    // Get our rendered page's AST.
    const renderTemplate: IParsedTemplate | null = {
      name: renderedAst.name,
      type: renderedAst.type,
      ast: renderedAst.ast,
      templates: siteData.hbs.templates,
      components: siteData.hbs.components,
      stylesheets: siteData.hbs.stylesheets,
    };
    const context = makePageContext(renderedRecord, records, Object.values(siteData.hbs.templates), siteData);
    window.cancelAnimationFrame(queuedRender);
    queuedRender = window.requestAnimationFrame(async() => {
      const doc = (document.getElementById('vapid-preview') as HTMLIFrameElement).contentDocument;
      const scratchDoc = (document.getElementById('vapid-preview-scratch') as HTMLIFrameElement).contentDocument;
      if (!doc || !scratchDoc) { return; }
      await render(scratchDoc as unknown as SimpleDocument, renderTemplate, context);
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
      if (isFirstRender) {
        const script = document.createElement('script');
        script.setAttribute('src', document.getElementById('highlight-script')?.getAttribute('href') || document.getElementById('highlight-script')?.getAttribute('src') || '');
        doc.head.appendChild(script);
      }
      isFirstRender = false;
    });
  }, [ renderedRecord, renderedAst, siteData, record ]);

  return <Fragment />;
}
