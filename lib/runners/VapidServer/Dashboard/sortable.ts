import sortable from 'html5sortable';
import $ from 'jquery';

document.addEventListener("turbolinks:load", () => {
  const el = document.querySelector('.draggable.table tbody') as HTMLElement;

  if (el) {
    sortable(el, { forcePlaceholderSize: true });

    el.addEventListener('sortupdate', (e: any) => {
      const { item } = e.detail;
      const { index: from } = e.detail.origin;
      const { index: to } = e.detail.destination;
      const id = item.getAttribute('data-id');

      $.post('/dashboard/records/reorder', { id, from, to }).fail((_err) => {
        // TODO: probably need some better client-side error handling here
        alert('Error: could not reorder records');
      });
    });
  }
});

document.addEventListener("turbolinks:load", () => {
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

      // Check if this element is a nav item.
      let nav = false;
      for (const el of item.parentElement.children) {
        if (el.tagName.toLowerCase() === 'hr') { break; }
        if (el === item) { nav = true; }
      }

      $.post('/dashboard/records/reorder', { id, from, to, nav }).fail((_err) => {
        // TODO: probably need some better client-side error handling here
        alert('Error: could not reorder records');
      });
    });
  }
});
