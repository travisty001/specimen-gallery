const $ = id => document.getElementById(id);
const viewer = $('viewer');
await customElements.whenDefined('model-viewer');
let specimens = [], localURL = null, selected = null;
const defaultOrbit = '0deg 75deg auto';
const setText = (id, text) => { $(id).textContent = text; };
function asset(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.split('/').includes('..')) throw new Error('Use a relative asset path');
  const url = new URL(path, document.baseURI);
  if (url.origin !== location.origin) throw new Error('Use an asset in this gallery');
  return url.href;
}
function busy(message) { setText('status', message); }
function enabled(value) {
  document.querySelectorAll('[data-orbit],#reset,#rotate,#lighting,#fullscreen').forEach(el => el.disabled = !value);
}
function reset() {
  viewer.cameraOrbit = defaultOrbit;
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = 'auto';
  viewer.autoRotate = false;
  viewer.resetTurntableRotation(0);
  viewer.exposure = 1;
  $('lighting').value = '1';
  $('rotate').setAttribute('aria-pressed', 'false');
}
function load(src, title) {
  enabled(false);
  viewer.hidden = false;
  $('empty').hidden = true;
  reset();
  viewer.alt = `Interactive 3D scan: ${title}`;
  viewer.src = src;
  busy('Loading scan…');
}
viewer.addEventListener('load', () => { enabled(true); busy(''); });
viewer.addEventListener('error', () => { enabled(false); busy('This scan could not be opened. Check that it is a valid, self-contained GLB.'); });
document.querySelectorAll('[data-orbit]').forEach(button => button.addEventListener('click', () => {
  viewer.autoRotate = false;
  $('rotate').setAttribute('aria-pressed', 'false');
  viewer.resetTurntableRotation(0);
  viewer.cameraOrbit = button.dataset.orbit;
}));
$('reset').addEventListener('click', reset);
$('rotate').addEventListener('click', () => {
  viewer.autoRotate = !viewer.autoRotate;
  $('rotate').setAttribute('aria-pressed', String(viewer.autoRotate));
});
$('background').addEventListener('click', () => {
  const light = $('stage').classList.toggle('light');
  $('background').setAttribute('aria-pressed', String(light));
  setText('background', light ? 'Dark background' : 'Light background');
});
$('lighting').addEventListener('change', event => { viewer.exposure = Number(event.target.value); });
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('stage').requestFullscreen) await $('stage').requestFullscreen();
    else busy('Full screen is unavailable in this browser. Turn your phone sideways for a larger view.');
  } catch { busy('Full screen is unavailable in this browser.'); }
});
function clearLocal() { if (localURL) { URL.revokeObjectURL(localURL); localURL = null; } }
function renderReferences(images = []) {
  $('references').replaceChildren();
  for (const item of images) {
    const figure = document.createElement('figure'), a = document.createElement('a'), img = document.createElement('img'), caption = document.createElement('figcaption');
    a.href = asset(item.src); a.target = '_blank'; a.rel = 'noopener';
    img.src = a.href; img.alt = item.caption || 'Specimen reference image'; img.loading = 'lazy';
    caption.textContent = item.caption || '';
    a.append(img); figure.append(a, caption); $('references').append(figure);
  }
}
function selectSpecimen(id) {
  const specimen = specimens.find(item => item.id === id);
  if (!specimen) return;
  const src = asset(specimen.file);
  clearLocal(); selected = id;
  setText('mode-label', 'Published specimen'); setText('viewer-label', specimen.id.toUpperCase());
  setText('record-id', specimen.id.toUpperCase()); setText('record-title', specimen.title);
  setText('description', specimen.description || '');
  setText('observations', specimen.observations || 'No observations published yet.');
  setText('interpretation', specimen.interpretation || 'Identification not established.');
  $('download').hidden = !specimen.allowDownload;
  if (specimen.allowDownload) $('download').href = src;
  renderReferences(specimen.images);
  document.querySelectorAll('.specimen').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === id)));
  load(src, specimen.title);
}
$('file').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!/\.glb$/i.test(file.name)) { busy('Choose a .glb file.'); event.target.value = ''; return; }
  clearLocal(); selected = null;
  localURL = URL.createObjectURL(file);
  history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('.specimen').forEach(button => button.setAttribute('aria-pressed', 'false'));
  setText('mode-label', 'Local preview · not published'); setText('viewer-label', 'PRIVATE PREVIEW');
  setText('record-id', 'LOCAL FILE'); setText('record-title', file.name);
  setText('description', `${(file.size / 1048576).toFixed(1)} MB · Previewed on this device. Reloading closes this file.`);
  setText('observations', 'No published observations are attached to this local file.');
  setText('interpretation', 'This preview does not publish the model or establish its identification.');
  $('download').hidden = true; renderReferences(); load(localURL, file.name);
  event.target.value = '';
});
window.addEventListener('hashchange', () => {
  try { selectSpecimen(decodeURIComponent(location.hash.slice(1))); } catch { busy('That specimen link could not be opened.'); }
});
try {
  const response = await fetch('specimens.json', {cache: 'no-cache'});
  if (!response.ok) throw new Error('Collection unavailable');
  const data = await response.json();
  if (!Array.isArray(data.specimens)) throw new Error('Invalid catalog');
  const ids = new Set();
  for (const specimen of data.specimens) {
    if (!specimen.id || typeof specimen.id !== 'string' || !specimen.title || ids.has(specimen.id)) throw new Error('Invalid specimen record');
    asset(specimen.file); (specimen.images || []).forEach(image => asset(image.src)); ids.add(specimen.id);
  }
  specimens = data.specimens;
  setText('count', `${specimens.length} published specimen${specimens.length === 1 ? '' : 's'}`);
  if (!specimens.length) {
    const p = document.createElement('p'); p.className = 'empty-list'; p.textContent = 'The collection is being prepared. Check back for the first specimen.'; $('specimens').append(p);
  }
  specimens.forEach(specimen => {
    const button = document.createElement('button'), id = document.createElement('span'), title = document.createElement('strong');
    button.className = 'specimen'; button.dataset.id = specimen.id; button.setAttribute('aria-pressed', 'false');
    id.textContent = specimen.id; title.textContent = specimen.title; button.append(id, title);
    button.addEventListener('click', () => { if (location.hash === '#' + encodeURIComponent(specimen.id)) selectSpecimen(specimen.id); else location.hash = encodeURIComponent(specimen.id); });
    $('specimens').append(button);
  });
  let requested;
  try { requested = decodeURIComponent(location.hash.slice(1)); } catch { requested = ''; }
  if (specimens.length) selectSpecimen(specimens.some(item => item.id === requested) ? requested : specimens[0].id);
} catch (error) {
  setText('count', 'Collection unavailable'); busy('The collection could not be loaded. You can still preview a local GLB.'); console.error(error);
}
