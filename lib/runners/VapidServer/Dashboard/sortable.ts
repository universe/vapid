import sortable from 'html5sortable';

export function init() {
  const tbody = document.querySelector('.sortable.table tbody') as HTMLElement;

  if (tbody) {
    sortable(tbody, { forcePlaceholderSize: true });

    tbody.addEventListener('sortupdate', (e: any) => {
      const { item } = e.detail;
      const { index: from } = e.detail.origin;
      const { index: to } = e.detail.destination;
      const id = item.getAttribute('data-id');
      const parentId = item.getAttribute('data-parent-id');
      const csrf = document.getElementById('csrf-token')?.getAttribute('content') || '';
      window.fetch('/api/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ id, from, to, parentId }),
      }).catch((_err) => {
        // TODO: probably need some better client-side error handling here
        alert('Error: could not reorder records');
      });
    });
  }

  const el = document.querySelector('.menu.sortable') as HTMLElement;

  if (el) {
    sortable(el, {
      forcePlaceholderSize: false,
      items: 'a',
      placeholder: '<a class="item" style="height: 37px"></a>',
    });

    el.addEventListener('sortupdate', (e: any) => {
      const { item } = e.detail;
      const id = item.getAttribute('data-id');
      const { index: from } = e.detail.origin;
      const { index: to } = e.detail.destination;
      const csrf = document.getElementById('csrf-token')?.getAttribute('content') || '';

      // Check if this element is a nav item.
      let nav = false;
      for (const el of item.parentElement.children) {
        if (el.tagName.toLowerCase() === 'hr') { break; }
        if (el === item) { nav = true; }
      }

      window.fetch('/api/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ id, from, to, parentId: nav ? 'navigation' : null }),
      }).catch((_err) => {
        // TODO: probably need some better client-side error handling here
        alert('Error: could not reorder records');
      });
    });
  }
}
