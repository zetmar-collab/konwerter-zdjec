'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const OUTPUT_FORMATS = {
  jpeg: { ext: 'jpg',  mime: 'image/jpeg', label: 'JPEG' },
  png:  { ext: 'png',  mime: 'image/png',  label: 'PNG'  },
  webp: { ext: 'webp', mime: 'image/webp', label: 'WebP' },
  bmp:  { ext: 'bmp',  mime: 'image/bmp',  label: 'BMP'  },
};

const RAW_EXTS  = new Set(['dng','cr2','cr3','nef','arw','raf','orf','rw2','raw','pef','srw','x3f']);
const HEIC_EXTS = new Set(['heic','heif']);

// ── State ──────────────────────────────────────────────────────────────────
const files = []; // { id, file, name, ext, type, status, resultBlob, resultName, originalSize, resultSize, width, height }
let nextId = 0;

// ── DOM refs ───────────────────────────────────────────────────────────────
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const fileListEl     = document.getElementById('file-list');
const listHeader     = document.getElementById('list-header');
const listCount      = document.getElementById('list-count');
const emptyState     = document.getElementById('empty-state');
const btnConvertAll  = document.getElementById('btn-convert-all');
const btnDownloadAll = document.getElementById('btn-download-all');
const btnPdfAll      = document.getElementById('btn-pdf-all');
const btnClear       = document.getElementById('btn-clear');
const btnInstall     = document.getElementById('btn-install');
const outFormatSel   = document.getElementById('out-format');
const qualitySlider  = document.getElementById('quality');
const qualityVal     = document.getElementById('quality-val');
const qualityGroup   = document.getElementById('quality-group');
const resizeEnable   = document.getElementById('resize-enable');
const resizeFields   = document.getElementById('resize-fields');
const resizeW        = document.getElementById('resize-w');
const resizeH        = document.getElementById('resize-h');
const aspectLock     = document.getElementById('aspect-lock');
const pngGroup       = document.getElementById('png-group');
const pngColorsSlider= document.getElementById('png-colors');
const pngColorsVal   = document.getElementById('png-colors-val');

// ── PWA Install ────────────────────────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  btnInstall.classList.add('visible');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') btnInstall.classList.remove('visible');
  deferredInstallPrompt = null;
});

// ── Service Worker ─────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── Settings events ────────────────────────────────────────────────────────
outFormatSel.addEventListener('change', () => {
  const fmt = outFormatSel.value;
  const isPng = fmt === 'png';
  const isBmp = fmt === 'bmp';
  qualityGroup.style.display = (isPng || isBmp) ? 'none' : '';
  pngGroup.style.display     = isPng ? '' : 'none';
});

// ── JPEG quality presets ───────────────────────────────────────────────────
document.getElementById('jpeg-presets').addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  document.querySelectorAll('#jpeg-presets .preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const q = parseInt(btn.dataset.q);
  qualitySlider.value  = q;
  qualityVal.textContent = q + '%';
});

// Deactivate presets when slider moved manually
qualitySlider.addEventListener('mousedown', () => {
  document.querySelectorAll('#jpeg-presets .preset-btn').forEach(b => b.classList.remove('active'));
});

// ── PNG color presets ──────────────────────────────────────────────────────
document.getElementById('png-presets').addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  document.querySelectorAll('#png-presets .preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const c = parseInt(btn.dataset.c);
  pngColorsSlider.value = c;
  pngColorsVal.textContent = c === 0 ? 'Lossless' : `${c} kolorów`;
});

pngColorsSlider.addEventListener('input', () => {
  const c = parseInt(pngColorsSlider.value);
  pngColorsVal.textContent = c === 0 ? 'Lossless' : `${c} kolorów`;
  document.querySelectorAll('#png-presets .preset-btn').forEach(b => b.classList.remove('active'));
});

qualitySlider.addEventListener('input', () => {
  qualityVal.textContent = qualitySlider.value + '%';
});

resizeEnable.addEventListener('change', () => {
  resizeFields.classList.toggle('visible', resizeEnable.checked);
});

// Aspect ratio lock
let lockAspect = { w: 0, h: 0 };

resizeW.addEventListener('input', () => {
  if (!aspectLock.checked || !lockAspect.w) return;
  const ratio = lockAspect.h / lockAspect.w;
  if (resizeW.value) resizeH.value = Math.round(resizeW.value * ratio) || '';
});

resizeH.addEventListener('input', () => {
  if (!aspectLock.checked || !lockAspect.h) return;
  const ratio = lockAspect.w / lockAspect.h;
  if (resizeH.value) resizeW.value = Math.round(resizeH.value * ratio) || '';
});

// ── Drag & Drop ────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

['dragleave', 'dragend'].forEach(ev =>
  dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover'))
);

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', () => {
  handleFiles([...fileInput.files]);
  fileInput.value = '';
});

// ── File handling ──────────────────────────────────────────────────────────
function getFileType(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (HEIC_EXTS.has(ext)) return 'heic';
  if (RAW_EXTS.has(ext))  return 'raw';
  return 'standard';
}

function handleFiles(newFiles) {
  if (!newFiles.length) return;
  newFiles.forEach(file => {
    const id   = nextId++;
    const ext  = file.name.split('.').pop().toLowerCase();
    const type = getFileType(file);
    const item = { id, file, name: file.name, ext, type, status: 'pending', resultBlob: null, resultName: null, originalSize: file.size, resultSize: 0, width: 0, height: 0 };
    files.push(item);
    renderCard(item);
  });
  updateListUI();
}

function updateListUI() {
  const hasFiles = files.length > 0;
  listHeader.style.display = hasFiles ? '' : 'none';
  emptyState.classList.toggle('visible', !hasFiles);
  listCount.textContent = `${files.length} ${plFiles(files.length)}`;

  const allDone = files.length > 0 && files.every(f => f.status === 'done');
  btnDownloadAll.disabled = !allDone;
  const hasDone = files.some(f => f.status === 'done' && f.resultBlob);
  btnPdfAll.disabled = !hasDone;
}

function plFiles(n) {
  if (n === 1) return 'plik';
  if (n >= 2 && n <= 4) return 'pliki';
  return 'plików';
}

// ── Render card ────────────────────────────────────────────────────────────
function renderCard(item) {
  const card = document.createElement('div');
  card.className = 'file-card';
  card.id = `card-${item.id}`;
  card.innerHTML = `
    <div class="thumb" id="thumb-${item.id}">📄</div>
    <div class="file-info">
      <div class="file-name" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
      <div class="file-meta" id="meta-${item.id}">
        <span>${formatSize(item.originalSize)}</span>
        <span class="ext-badge">${item.ext.toUpperCase()}</span>
      </div>
      <div class="progress-bar-wrap" id="prog-${item.id}">
        <div class="progress-bar" style="width:0%"></div>
      </div>
    </div>
    <div class="file-status pending" id="status-${item.id}">Oczekuje</div>
    <div class="card-actions">
      <button class="btn btn-primary" id="btn-conv-${item.id}" onclick="convertOne(${item.id})" title="Konwertuj">&#9654;</button>
      <button class="btn-icon" id="btn-dl-${item.id}" onclick="downloadOne(${item.id})" title="Pobierz jako obraz" disabled>&#8659;</button>
      <button class="btn-icon btn-icon-pdf" id="btn-pdf-${item.id}" onclick="exportOneToPdf(${item.id})" title="Eksportuj do PDF" disabled>&#128196;</button>
      <button class="btn-icon" onclick="removeFile(${item.id})" title="Usuń">&#10005;</button>
    </div>`;
  fileListEl.appendChild(card);

  // Generate thumbnail for standard images
  if (item.type === 'standard') {
    const url = URL.createObjectURL(item.file);
    const img = new Image();
    img.onload = () => {
      item.width  = img.naturalWidth;
      item.height = img.naturalHeight;
      updateMeta(item);
      // Set aspect reference
      lockAspect = { w: img.naturalWidth, h: img.naturalHeight };
    };
    img.src = url;
    const thumbEl = document.getElementById(`thumb-${item.id}`);
    thumbEl.innerHTML = `<img src="${url}" alt="">`;
  } else if (item.type === 'heic') {
    document.getElementById(`thumb-${item.id}`).innerHTML = '🍎';
  } else {
    document.getElementById(`thumb-${item.id}`).innerHTML = '📷';
  }
}

function updateMeta(item) {
  const metaEl = document.getElementById(`meta-${item.id}`);
  if (!metaEl) return;
  const dims = item.width && item.height ? `<span>${item.width}×${item.height}</span>` : '';
  const resultInfo = item.resultSize ? `<span>→ ${formatSize(item.resultSize)}</span>` : '';
  metaEl.innerHTML = `<span>${formatSize(item.originalSize)}</span><span>${item.ext.toUpperCase()}</span>${dims}${resultInfo}`;
}

function setCardStatus(id, status, text) {
  const card   = document.getElementById(`card-${id}`);
  const statEl = document.getElementById(`status-${id}`);
  if (!card || !statEl) return;
  card.className = `file-card ${status}`;
  const icons = { pending: '', processing: '<span class="spinner"></span>', done: '✓', error: '✗' };
  statEl.className = `file-status ${status}`;
  statEl.innerHTML = `${icons[status] || ''} ${text}`;
}

function setProgress(id, pct) {
  const wrap = document.getElementById(`prog-${id}`);
  if (!wrap) return;
  wrap.classList.toggle('visible', pct > 0 && pct < 100);
  const bar = wrap.querySelector('.progress-bar');
  if (bar) bar.style.width = pct + '%';
}

// ── Decode helpers ─────────────────────────────────────────────────────────
async function decodeStandard(file) {
  const url    = URL.createObjectURL(file);
  const bitmap = await createImageBitmap(await fetch(url).then(r => r.blob()));
  URL.revokeObjectURL(url);
  return bitmap;
}

async function decodeHEIC(file) {
  if (typeof heic2any === 'undefined') throw new Error('Biblioteka heic2any niedostępna');
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  return createImageBitmap(resultBlob);
}

async function decodeRAW(file) {
  if (typeof UTIF === 'undefined') throw new Error('Biblioteka UTIF niedostępna');
  const buffer = await file.arrayBuffer();

  // Try UTIF (handles DNG, NEF, CR2, ARW, ORF, PEF, SRW as TIFF-based)
  try {
    const ifds = UTIF.decode(buffer);
    if (!ifds || ifds.length === 0) throw new Error('Brak danych IFD');

    // Find the largest IFD (full-resolution image)
    let bestIfd = ifds[0];
    let bestPx  = 0;
    for (const ifd of ifds) {
      UTIF.decodeImage(buffer, ifd);
      const px = (ifd.width || 0) * (ifd.height || 0);
      if (px > bestPx) { bestPx = px; bestIfd = ifd; }
    }
    UTIF.decodeImage(buffer, bestIfd);
    const rgba   = UTIF.toRGBA8(bestIfd);
    const width  = bestIfd.width;
    const height = bestIfd.height;

    if (!width || !height || !rgba || rgba.length === 0) throw new Error('Pusty obraz');

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx  = canvas.getContext('2d');
    const data = ctx.createImageData(width, height);
    data.data.set(rgba);
    ctx.putImageData(data, 0, 0);
    return await createImageBitmap(canvas);
  } catch (utifErr) {
    // Fallback: try to extract embedded JPEG thumbnail for proprietary RAW (CR3, RAF, RW2, X3F)
    return await extractEmbeddedJpeg(buffer, file.name);
  }
}

async function extractEmbeddedJpeg(buffer, filename) {
  // Many RAW files contain a full-res JPEG preview — find it by JFIF/EXIF marker
  const view  = new Uint8Array(buffer);
  let bestStart = -1;
  let bestSize  = 0;

  for (let i = 0; i < view.length - 3; i++) {
    if (view[i] === 0xFF && view[i+1] === 0xD8 && view[i+2] === 0xFF) {
      // Find matching EOI marker
      for (let j = view.length - 2; j > i + 1024; j--) {
        if (view[j] === 0xFF && view[j+1] === 0xD9) {
          const size = j - i + 2;
          if (size > bestSize) { bestSize = size; bestStart = i; }
          break;
        }
      }
    }
  }

  if (bestStart === -1 || bestSize < 10240) {
    throw new Error(`Nie można odczytać pliku RAW ${filename.split('.').pop().toUpperCase()} — format nieobsługiwany przez przeglądarkę`);
  }

  const jpegBytes = view.slice(bestStart, bestStart + bestSize);
  const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
  return createImageBitmap(blob);
}

async function decodeAny(item) {
  switch (item.type) {
    case 'heic':     return decodeHEIC(item.file);
    case 'raw':      return decodeRAW(item.file);
    default:         return decodeStandard(item.file);
  }
}

// ── Resize ─────────────────────────────────────────────────────────────────
function applyResize(bitmap, targetW, targetH, keepAspect) {
  let w = targetW || bitmap.width;
  let h = targetH || bitmap.height;

  if (keepAspect) {
    const ratio = bitmap.width / bitmap.height;
    if (targetW && !targetH) h = Math.round(targetW / ratio);
    else if (targetH && !targetW) w = Math.round(targetH * ratio);
    else if (targetW && targetH) {
      const scale = Math.min(targetW / bitmap.width, targetH / bitmap.height);
      w = Math.round(bitmap.width  * scale);
      h = Math.round(bitmap.height * scale);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

// ── BMP encoder (canvas.toBlob nie obsługuje image/bmp) ────────────────────
function encodeBMP(canvas) {
  const ctx       = canvas.getContext('2d');
  const { width, height } = canvas;
  const imgData   = ctx.getImageData(0, 0, width, height).data;
  const rowSize   = Math.floor((24 * width + 31) / 32) * 4; // padded to 4 bytes
  const pixBytes  = rowSize * height;
  const fileSize  = 54 + pixBytes;
  const buf       = new ArrayBuffer(fileSize);
  const v         = new DataView(buf);

  // File header
  v.setUint8(0, 0x42); v.setUint8(1, 0x4D); // 'BM'
  v.setUint32(2, fileSize, true);
  v.setUint32(6, 0, true);
  v.setUint32(10, 54, true);

  // DIB header (BITMAPINFOHEADER)
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true);   // positive = bottom-up storage
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);      // 24-bit RGB
  v.setUint32(30, 0, true);
  v.setUint32(34, pixBytes, true);
  v.setInt32(38, 2835, true);
  v.setInt32(42, 2835, true);
  v.setUint32(46, 0, true);
  v.setUint32(50, 0, true);

  // Pixel data: BGR, bottom-up
  let off = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      v.setUint8(off++, imgData[i + 2]); // B
      v.setUint8(off++, imgData[i + 1]); // G
      v.setUint8(off++, imgData[i]);     // R
    }
    for (let p = 0; p < rowSize - width * 3; p++) v.setUint8(off++, 0);
  }

  return Promise.resolve(new Blob([buf], { type: 'image/bmp' }));
}

// ── Encode ─────────────────────────────────────────────────────────────────
function encodeCanvas(canvas, format, quality) {
  // BMP: canvas.toBlob nie obsługuje tego formatu
  if (format === 'bmp') {
    return encodeBMP(canvas);
  }

  // PNG with UPNG quantization (lossy compression)
  if (format === 'png' && typeof UPNG !== 'undefined') {
    try {
      const colorCount = parseInt(pngColorsSlider.value); // 0 = lossless
      const ctx  = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const out  = UPNG.encode([data.data.buffer], canvas.width, canvas.height, colorCount);
      return Promise.resolve(new Blob([out], { type: 'image/png' }));
    } catch (e) {
      // fallback do canvas.toBlob
    }
  }

  // JPEG / WebP / PNG fallback via canvas toBlob
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error(`Format ${format.toUpperCase()} nie jest obsługiwany przez tę przeglądarkę`));
    }, OUTPUT_FORMATS[format].mime, quality / 100);
  });
}

// ── Convert single file ────────────────────────────────────────────────────
async function convertOne(id) {
  const item = files.find(f => f.id === id);
  if (!item || item.status === 'processing') return;

  const format   = outFormatSel.value;
  const quality  = parseInt(qualitySlider.value);
  const doResize = resizeEnable.checked;
  const targetW  = doResize ? (parseInt(resizeW.value) || 0) : 0;
  const targetH  = doResize ? (parseInt(resizeH.value) || 0) : 0;
  const keepAsp  = aspectLock.checked;

  item.status = 'processing';
  setCardStatus(id, 'processing', 'Konwertowanie…');
  setProgress(id, 10);

  const convBtn = document.getElementById(`btn-conv-${id}`);
  if (convBtn) convBtn.disabled = true;

  try {
    setProgress(id, 30);
    const bitmap = await decodeAny(item);

    setProgress(id, 60);
    item.width  = bitmap.width;
    item.height = bitmap.height;

    const canvas = applyResize(bitmap, targetW, targetH, keepAsp);
    bitmap.close?.();

    setProgress(id, 80);
    const blob = await encodeCanvas(canvas, format, quality);
    setProgress(id, 100);

    const baseName    = item.name.replace(/\.[^.]+$/, '');
    item.resultBlob   = blob;
    item.resultName   = `${baseName}.${OUTPUT_FORMATS[format].ext}`;
    item.resultSize   = blob.size;
    item.status       = 'done';

    setCardStatus(id, 'done', 'Gotowe');
    updateMeta(item);

    const dlBtn = document.getElementById(`btn-dl-${id}`);
    if (dlBtn) dlBtn.disabled = false;

    // Enable PDF button only for JPEG and PNG output
    if (format === 'jpeg' || format === 'png') {
      const pdfBtn = document.getElementById(`btn-pdf-${id}`);
      if (pdfBtn) pdfBtn.disabled = false;
    }

    setProgress(id, 0);
    updateListUI();
  } catch (err) {
    item.status = 'error';
    setCardStatus(id, 'error', 'Błąd');
    setProgress(id, 0);
    if (convBtn) convBtn.disabled = false;
    toast('error', `${item.name}: ${err.message}`);
    console.error(err);
  }
}

// ── Convert all ────────────────────────────────────────────────────────────
btnConvertAll.addEventListener('click', async () => {
  const pending = files.filter(f => f.status === 'pending' || f.status === 'error');
  if (!pending.length) {
    toast('error', 'Brak plików do konwersji');
    return;
  }
  btnConvertAll.disabled = true;
  for (const item of pending) {
    await convertOne(item.id);
  }
  btnConvertAll.disabled = false;
});

// ── Download single ────────────────────────────────────────────────────────
function downloadOne(id) {
  const item = files.find(f => f.id === id);
  if (!item || !item.resultBlob) return;
  triggerDownload(item.resultBlob, item.resultName);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Download all as ZIP ────────────────────────────────────────────────────
btnDownloadAll.addEventListener('click', async () => {
  const done = files.filter(f => f.status === 'done' && f.resultBlob);
  if (!done.length) return;

  btnDownloadAll.disabled = true;
  btnDownloadAll.textContent = '⏳ Pakowanie…';

  try {
    const zip = new JSZip();
    done.forEach(item => zip.file(item.resultName, item.resultBlob));
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    triggerDownload(zipBlob, `konwersja_${Date.now()}.zip`);
    toast('success', `Pobrano ${done.length} ${plFiles(done.length)} jako ZIP`);
  } catch (err) {
    toast('error', 'Błąd tworzenia ZIP: ' + err.message);
  } finally {
    btnDownloadAll.disabled = false;
    btnDownloadAll.innerHTML = '&#8659; Pobierz ZIP';
    updateListUI();
  }
});

// ── PDF export ─────────────────────────────────────────────────────────────
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function buildPdfFromItems(items) {
  const { jsPDF } = window.jspdf;
  let pdf = null;

  for (const item of items) {
    const dataUrl = await blobToDataURL(item.resultBlob);
    const img = new Image();
    img.src = dataUrl;
    await new Promise(r => { img.onload = r; });

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    // Convert px → mm (96 dpi baseline)
    const mmW = +(imgW * 25.4 / 96).toFixed(2);
    const mmH = +(imgH * 25.4 / 96).toFixed(2);
    const orient = imgW >= imgH ? 'landscape' : 'portrait';
    const fmt = item.resultBlob.type === 'image/png' ? 'PNG' : 'JPEG';

    if (!pdf) {
      pdf = new jsPDF({ orientation: orient, unit: 'mm', format: [mmW, mmH] });
    } else {
      pdf.addPage([mmW, mmH], orient);
    }
    pdf.addImage(dataUrl, fmt, 0, 0, mmW, mmH, '', 'FAST');
  }
  return pdf;
}

async function exportOneToPdf(id) {
  const item = files.find(f => f.id === id);
  if (!item || !item.resultBlob) return;

  const btn = document.getElementById(`btn-pdf-${id}`);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    const pdf      = await buildPdfFromItems([item]);
    const pdfName  = item.resultName.replace(/\.[^.]+$/, '') + '.pdf';
    pdf.save(pdfName);
    toast('success', `Zapisano ${pdfName}`);
  } catch (err) {
    toast('error', 'Błąd PDF: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '&#128196;'; }
  }
}

btnPdfAll.addEventListener('click', async () => {
  const done = files.filter(f => f.status === 'done' && f.resultBlob);
  if (!done.length) return;

  btnPdfAll.disabled = true;
  btnPdfAll.textContent = '⏳ Generowanie…';

  try {
    const pdf = await buildPdfFromItems(done);
    pdf.save(`konwersja_${Date.now()}.pdf`);
    toast('success', `Wyeksportowano ${done.length} ${plFiles(done.length)} do PDF`);
  } catch (err) {
    toast('error', 'Błąd PDF: ' + err.message);
  } finally {
    btnPdfAll.disabled = false;
    btnPdfAll.innerHTML = '&#128196; Eksportuj do PDF';
    updateListUI();
  }
});

// ── Remove / clear ─────────────────────────────────────────────────────────
function removeFile(id) {
  const idx = files.findIndex(f => f.id === id);
  if (idx === -1) return;
  files.splice(idx, 1);
  document.getElementById(`card-${id}`)?.remove();
  updateListUI();
}

btnClear.addEventListener('click', () => {
  files.length = 0;
  fileListEl.innerHTML = '';
  updateListUI();
});

// ── Toast notifications ────────────────────────────────────────────────────
function toast(type, msg) {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'success' ? '✓' : '✗'} ${escHtml(msg)}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ── Utilities ──────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024)         return bytes + ' B';
  if (bytes < 1024 * 1024)  return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────────────────────────
updateListUI();
