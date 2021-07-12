import $ from 'jquery';

document.addEventListener("turbolinks:load", () => {
  // Semantic UI
  // @ts-ignore
  $('.ui.checkbox').checkbox?.();
    // @ts-ignore
  $('.ui.dropdown').dropdown?.();
    // @ts-ignore
  $('.ui.sortable.table').tablesort?.();
});

document.addEventListener("turbolinks:load", () => {
  $(document.body).on('keyup', '.ui.dropdown.custom', (evt) => {
    if (evt.keyCode !== 13) { return; }
    const { target } = evt;
    const { value } = target;
    const select = evt.target.parentElement.querySelector('select');
    const op = document.createElement('option');
    op.innerText = value;
    op.setAttribute('value', value);
    op.setAttribute('selected', 'true');
    select.insertBefore(op, select.firstChild);
    target.value = '';
    select.value = value;
      // @ts-ignore
    $(select).dropdown();
  });
});
