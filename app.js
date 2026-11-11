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
  clearLocal(); selected = id; loadMarkers();
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
  clearLocal(); selected = null; loadMarkers();
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

const preset = $('turntable-preset'), pauseButton = $('turntable-pause');
let turntablePaused = false, stepAngle = 0, markerMode = false, markers = [];
const markerKey = () => 'specimen-gallery-poi:' + (selected || 'local');
function stopTurntable() { viewer.autoRotate = false; $('rotate').setAttribute('aria-pressed','false'); }
function applyTurntable() {
  stopTurntable();
  const mode = preset.value;
  pauseButton.textContent = turntablePaused ? 'Resume' : 'Pause';
  if (turntablePaused || mode === 'off' || mode === 'quarter') return;
  viewer.setAttribute('rotation-per-second', mode === 'present' ? '18deg' : mode === 'reverse' ? '-5deg' : '5deg');
  viewer.autoRotate = true;
}
preset.addEventListener('change', () => { turntablePaused = false; applyTurntable(); });
pauseButton.addEventListener('click', () => { turntablePaused = !turntablePaused; applyTurntable(); });
$('turntable-step').addEventListener('click', () => { stopTurntable(); preset.value = 'quarter'; stepAngle = (stepAngle + Math.PI / 2) % (2 * Math.PI); viewer.resetTurntableRotation(stepAngle); });
$('rotate').addEventListener('click', () => { preset.value = 'off'; turntablePaused = false; });
function saveMarkers() { if (selected) localStorage.setItem(markerKey(), JSON.stringify(markers)); }
function renderMarkers() {
  viewer.querySelectorAll('[data-poi]').forEach(node => node.remove());
  const list = $('annotation-list'); list.replaceChildren();
  markers.forEach((item, index) => {
    const marker = document.createElement('button');
    marker.className = 'poi-marker'; marker.slot = 'hotspot-poi-' + index;
    marker.dataset.poi = String(index); marker.dataset.position = item.position;
    marker.dataset.normal = item.normal || '0m 1m 0m';
    marker.textContent = String(index + 1); marker.title = item.title || 'Point ' + (index + 1);
    marker.addEventListener('click', e => { e.stopPropagation(); focusMarker(index); });
    viewer.append(marker);
    const row = document.createElement('div'); row.className = 'poi-entry';
    const select = document.createElement('button'); select.type = 'button'; select.textContent = (index + 1) + '. ' + (item.title || 'Untitled point');
    select.addEventListener('click', () => focusMarker(index));
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      const title = prompt('Point title', item.title || '');
      if (title === null) return;
      const note = prompt('Observation or hypothesis (label uncertainty)', item.note || '');
      if (note === null) return;
      item.title = title.slice(0, 120); item.note = note.slice(0, 2000); saveMarkers(); renderMarkers();
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { if (!confirm('Remove this point?')) return; markers.splice(index,1); saveMarkers(); renderMarkers(); });
    row.append(select, edit, remove);
    if (item.note) { const note = document.createElement('p'); note.textContent = item.note; row.append(note); }
    list.append(row);
  });
}
function focusMarker(index) {
  const item = markers[index]; if (!item) return;
  viewer.cameraTarget = item.position;
  $('annotation-help').textContent = item.title + (item.note ? ' — ' + item.note : '');
}
function loadMarkers() {
  try { markers = selected ? JSON.parse(localStorage.getItem(markerKey()) || '[]') : []; if (!Array.isArray(markers)) markers = []; } catch { markers = []; }
  renderMarkers();
}
$('annotate-mode').addEventListener('click', () => {
  markerMode = !markerMode;
  $('annotate-mode').setAttribute('aria-pressed', String(markerMode));
  $('annotation-help').textContent = markerMode ? 'Click the specimen surface to place a point. Dragging still rotates the view.' : 'Enable Place marker, then click a surface.';
});
let pointerStart = null;
viewer.addEventListener('pointerdown', e => { pointerStart = {x:e.clientX,y:e.clientY}; });
viewer.addEventListener('pointerup', e => {
  if (!markerMode || !pointerStart || Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6) return;
  if (typeof viewer.positionAndNormalFromPoint !== 'function') { $('annotation-help').textContent = 'Surface picking unavailable in this viewer.'; return; }
  const bounds = viewer.getBoundingClientRect();
  const hit = viewer.positionAndNormalFromPoint(e.clientX-bounds.left,e.clientY-bounds.top);
  if (!hit?.position) { $('annotation-help').textContent = 'No surface at that point. Try again.'; return; }
  const fmt = v => [v.x,v.y,v.z].map(n => Number(n).toFixed(6)+'m').join(' ');
  const title = prompt('Name this point of interest', 'Point ' + (markers.length + 1));
  if (title === null) return;
  const note = prompt('Observation / interpretation (optional)', '');
  markers.push({title:title.slice(0,120),note:(note||'').slice(0,2000),position:fmt(hit.position),normal:hit.normal ? fmt(hit.normal) : '0m 1m 0m'});
  saveMarkers(); renderMarkers();
});
$('annotations-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({schema:'specimen-gallery-poi-v1',specimen:selected || 'local',points:markers},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href=url; a.download=(selected || 'local')+'-annotations.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('annotations-import').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.schema !== 'specimen-gallery-poi-v1' || !Array.isArray(data.points) || data.points.length>1000 || data.points.some(p => typeof p.position !== 'string' || !/^-?[\\d.]+m -?[\\d.]+m -?[\\d.]+m$/.test(p.position))) throw Error('Invalid annotation file');
    if (data.specimen !== (selected || 'local') && !confirm('Annotations were created for a different specimen. Import anyway?')) return;
    markers = data.points.map(p=>({position:p.position,normal:typeof p.normal==='string'?p.normal:'0m 1m 0m',title:String(p.title||'Point').slice(0,120),note:String(p.note||'').slice(0,2000)}));
    saveMarkers(); renderMarkers();
  } catch(err) { $('annotation-help').textContent = 'Import failed: '+err.message; }
  finally { e.target.value=''; }
});
window.addEventListener('hashchange',()=>setTimeout(loadMarkers,0));
viewer.addEventListener('load',()=>{ applyTurntable(); renderMarkers(); });

const lightPresets = {
  neutral:{exposure:1,shadow:.5}, bright:{exposure:1.55,shadow:.45},
  low:{exposure:.65,shadow:.65}, soft:{exposure:1.15,shadow:.05},
  contrast:{exposure:.85,shadow:1}
};
function applyLight(exposure, shadow) {
  viewer.exposure = exposure; viewer.shadowIntensity = shadow;
  $('exposure-slider').value = exposure; $('shadow-slider').value = shadow;
  $('exposure-value').textContent = Number(exposure).toFixed(2);
  $('shadow-value').textContent = Number(shadow).toFixed(2);
  $('lighting').value = String(exposure) === '1.5' ? '1.5' : String(exposure) === '0.7' ? '0.7' : '1';
}
$('light-preset').addEventListener('change', e => {
  const p = lightPresets[e.target.value]; if (p) applyLight(p.exposure,p.shadow);
});
for (const id of ['exposure-slider','shadow-slider']) {
  $(id).addEventListener('input', () => {
    $('light-preset').value = 'neutral';
    applyLight(Number($('exposure-slider').value),Number($('shadow-slider').value));
  });
}
$('lighting').addEventListener('change', e => {
  const exposure = Number(e.target.value);
  applyLight(exposure, Number($('shadow-slider').value));
});
$('reset').addEventListener('click', () => {
  $('light-preset').value = 'neutral'; applyLight(1,.5);
});
