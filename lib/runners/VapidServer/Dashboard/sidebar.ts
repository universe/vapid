document.addEventListener("turbolinks:load", () => {
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('main');
  const toggle = document.querySelector('.toggle-sidebar');

  toggle?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation()
    document.body.classList.toggle('sidebar-open');
  });

  sidebar?.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    document.body.classList.remove('sidebar-open');
  });

  main?.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });
});
