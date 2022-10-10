import "./index.css";

import { IRecord,ITemplate, PageType } from "@neutrino/core";
import { IParsedTemplate, IWebsite, makePageContext, render } from '@neutrino/runtime';
import type { SimpleDocument } from '@simple-dom/interface';
import { useEffect, useLayoutEffect,useState } from 'preact/hooks';

import records from './records.js';

function getTemplate(type: PageType | null = null, name: string | null = '', templates: ITemplate[] = []) {
  if (!name || !type) { return null; }
  for (const template of templates) {
    if (template.type === type && template.name === name) { return template; }
  }
  return null;
}

function getRecord(records: IRecord[], template: string): IRecord | null {
  for (const record of records) {
    if (record.templateId === template) { return record; }
  }
  return null;
}

export default function Browser({ url, theme, img, hex, cta }: { url: string; theme: string; img: string; hex: string; cta: string | null; }) {
  const [ siteData, setSiteData ]  = useState<IWebsite | null>(null);
  const [ renderThrottle, setRenderThrottle ]  = useState<NodeJS.Timeout | null>(null);
  const designRecord = getRecord(records as IRecord[], 'design-settings');

  if (designRecord) {
    designRecord.content.color = { hex, cta };
    designRecord.content.theme = [theme];
    designRecord.content.logo = {
      focus: { x: 0, y: 0 },
      src: img || 'uploads/4dd6758486f61bcf22ff48f202a62bf5',
    };
  }

  useEffect(() => {
    (async() => {
      const data: IWebsite = await (await fetch(import.meta.env.SITE_DATA_URL)).json();
      setSiteData(data);
    })();
  }, [ hex, cta, img, theme ]);

  useLayoutEffect(() => {
    if (renderThrottle) { clearTimeout(renderThrottle); }
    console.log('clear');
    setRenderThrottle(setTimeout(() => {
      const template = getTemplate(PageType.PAGE, 'index', Object.values(siteData?.hbs?.templates || {})) || null;
      const record = getRecord(records as IRecord[], 'index-page');
      const ast = record ? siteData?.hbs?.pages[record.templateId] : null;
  
      if (!siteData || !template || !record || !ast) { return; }
      // Get our rendered page's AST.
      const renderTemplate: IParsedTemplate | null = {
        name: ast.name,
        type: ast.type,
        ast: ast.ast,
        templates: siteData.hbs.templates,
        components: siteData.hbs.components,
        stylesheets: siteData.hbs.stylesheets,
      };
      const data: Record<string, IRecord> = {};
      for (const record of records) {
        data[record.id] = record;
      }
      const context = makePageContext(false, record, data, Object.values(siteData.hbs.templates), siteData);
      const doc = (document.getElementById('onboarding-frame') as HTMLIFrameElement).contentDocument as unknown as SimpleDocument;
      render(doc, renderTemplate, context);
    }, 300));
  }, [siteData]);

  return <div class="browser">
    <div class="browser__row">
      <div class="browser__column browser__left">
        <span class="browser__dot" style="background:#ED594A;" />
        <span class="browser__dot" style="background:#FDD800;" />
        <span class="browser__dot" style="background:#5AC05A;" />
      </div>
      <div class="browser__column browser__middle">
        <input type="text" value={url} />
      </div>
      <div class="browser__column browser__right">
        <div style="float:right">
          <span class="browser__bar" />
          <span class="browser__bar" />
          <span class="browser__bar" />
        </div>
      </div>
    </div>
    <iframe class="browser__content" id="onboarding-frame" />
    {/* <div class="browser__content">
      <img class="browser__img" src="https://cdn.universe.app/images/website.png" />
      <h3>Universe Theme: {theme}</h3>
      <img src={img} />
      <div style="width: 24px; height: 24px; background-color: var(--primary);"></div>
      <div style="width: 24px; height: 24px; background-color: var(--cta);"></div>
      <p>How to create a detailed browser window look with CSS.</p>
    </div> */}
  </div>;
}