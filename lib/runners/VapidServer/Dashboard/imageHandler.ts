/* globals fetch, FormData, document */
export default async function imageHandler(id: string, b64Image: string, type = 'image/png') {
  // base64 to blob
  const blob = await fetch(b64Image).then(res => res.blob());

  const filename = [id, '.', type.match(/^image\/(\w+)$/i)?.[1]].join('');

  // generate a form data
  const formData = new FormData();
  formData.set('file', blob, filename);
  formData.set('_csrf', (document.getElementsByName('_csrf')[0] as HTMLInputElement).value);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  }).then(r => r.json());

  if (res.status !== 'success') { throw new Error(res.message); }
  return res.data;
};
