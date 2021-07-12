import $ from 'jquery';

document.addEventListener('turbolinks:load', () => {
  $('input[type=range]').on('input', function () {
    $(this).next('.label').text( $(this).val() as string );
  });
});
