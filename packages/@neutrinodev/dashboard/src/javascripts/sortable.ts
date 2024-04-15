import { NAVIGATION_GROUP_ID } from '@neutrinodev/core';
import sortable from 'html5sortable';

import { DataAdapter } from './adapters/types.js';

interface SortableUpdate {
  id: string;
  from: number;
  to: number;
  parentId: string | null;
}

interface SortableEvent {
  detail: { 
    item: Element;
    origin: { index: number };
    destination: { index: number }
  };
}

export function init(adapter: DataAdapter, onSort?: (update: SortableUpdate) => void) {
  const tbody = document.querySelector('.sortable.table tbody') as HTMLElement;

  if (tbody) {
    sortable(tbody, { forcePlaceholderSize: true });

    tbody.addEventListener('sortupdate' as 'click', (evt: unknown) => {
      const e = evt as unknown as SortableEvent; // For the TypeScript gods.
      const { item } = e.detail;
      const { index: from } = e.detail.origin;
      const { index: to } = e.detail.destination;
      const id = item.getAttribute('data-id');
      const parentId = item.getAttribute('data-parent-id');
      if (!id) { console.error('Missing Sort Update ID'); return; }
      adapter.updateOrder({ id, from, to, parentId });
    });
  }

  const el = document.querySelector('.menu.sortable') as HTMLElement;

  if (el) {
    sortable(el, {
      forcePlaceholderSize: false,
      items: 'a',
      placeholder: '<a class="item" style="height: 37px"></a>',
    });

    el.addEventListener('sortupdate', (evt: unknown) => {
      const e = evt as SortableEvent; // For the TypeScript gods.
      const { item } = e.detail;
      const id = item.getAttribute('data-id');
      if (!id) { console.error('Missing Sort Update ID'); return; }
      const { index: from } = e.detail.origin;
      const { index: to } = e.detail.destination;

      // Check if this element is a nav item.
      let nav = false;
      for (const el of Array.from(item?.parentElement?.children || [])) {
        if (el.tagName.toLowerCase() === 'hr') { break; }
        if (el === item) { nav = true; }
      }

      const update: SortableUpdate = { id, from, to, parentId: nav ? NAVIGATION_GROUP_ID : null };

      onSort?.(update);
      adapter.updateOrder(update);
    });
  }
}
