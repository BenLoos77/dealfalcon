// ============ STATE ============
let currentStep = 1;
let editingSection = null;
const TOTAL_STEPS = 5;
const KEYS = {
  company: 'df_company',
  brand: 'df_brand',
  onboarding: 'df_onboarding',
  account: 'df_account'
};

// ============ STORAGE HELPERS ============
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}
function loadStatus() { return loadJSON(KEYS.onboarding, { stepsDone: [] }); }
function markStepDone(n) {
  const s = loadStatus();
  if (!s.stepsDone.includes(n)) s.stepsDone.push(n);
  saveJSON(KEYS.onboarding, s);
  updateSidebarStatus();
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  const account = loadJSON(KEYS.account, null);
  const headerEmail = document.getElementById('header-email');
  if (account && account.email) {
    headerEmail.textContent = account.email;
  } else {
    headerEmail.textContent = 'Demo-Modus';
  }

  prefillCompanyFromAccount();
  restoreCompany();
  bindCompanyFields();
  restoreBrand();
  bindLogoUpload();
  bindPickerInputs();
  bindPreviewModeToggle();
  closePicker();
  updateSidebarStatus();

  // Click outside picker = close
  document.addEventListener('click', (e) => {
    const picker = document.getElementById('color-picker');
    if (!picker) return;
    if (picker.classList.contains('open') &&
        !picker.contains(e.target) &&
        !e.target.closest('[data-section]') &&
        !e.target.closest('.section-item')) {
      closePicker();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePicker();
  });
});

// ============ STEP 1: COMPANY ============
const COMPANY_FIELDS = ['c-company','c-street','c-city','c-zip','c-country','c-vatid','c-taxid','c-hreg','c-court','c-ceo','c-website'];

function prefillCompanyFromAccount() {
  const account = loadJSON(KEYS.account, null);
  const company = loadJSON(KEYS.company, null);
  if (company) return; // bereits gespeichert, nicht überschreiben
  if (!account) return;
  const initial = {
    'c-company': account.company || '',
    'c-street': account.street || '',
    'c-city': account.city || '',
    'c-zip': account.zip || '',
    'c-country': account.country || 'DE'
  };
  saveJSON(KEYS.company, initial);
}

function restoreCompany() {
  const data = loadJSON(KEYS.company, {});
  COMPANY_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && data[id] !== undefined) el.value = data[id];
  });
  updateMicrositeFromCompany();
}

function bindCompanyFields() {
  COMPANY_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const data = loadJSON(KEYS.company, {});
      data[id] = el.value;
      saveJSON(KEYS.company, data);
      updateMicrositeFromCompany();
      el.classList.remove('invalid');
    });
  });
}

function updateMicrositeFromCompany() {
  const data = loadJSON(KEYS.company, {});
  const nameEl = document.getElementById('mp-company-name');
  if (nameEl) nameEl.textContent = data['c-company'] || 'Ihr Unternehmen';
}

function completeStep1() {
  const required = ['c-company','c-street','c-city','c-zip'];
  let firstInvalid = null;
  required.forEach(id => {
    const el = document.getElementById(id);
    const ok = (el.value || '').trim().length > 0;
    el.classList.toggle('invalid', !ok);
    if (!ok && !firstInvalid) firstInvalid = el;
  });
  if (firstInvalid) {
    showToast('Bitte alle Pflichtfelder ausfüllen.', 'error');
    firstInvalid.focus();
    return;
  }
  markStepDone(1);
  showToast('Firmendaten gespeichert.', 'success');
  setTimeout(() => goToStep(2), 400);
}

// ============ STEP 2: BRAND ============
const SECTION_VARS = {
  'banner': '--mp-banner-bg',
  'hero-bg': '--mp-hero-bg',
  'hero-title': '--mp-hero-title',
  'hero-subline': '--mp-hero-subline',
  'version-pill': '--mp-versionspill-bg',
  'data-bg': '--mp-data-bg',
  'cta-bg': '--mp-cta-bg',
  'button': '--mp-button-bg'
};
const SECTION_LABELS = {
  'banner': 'Status-Banner',
  'hero-bg': 'Hero-Hintergrund',
  'hero-title': 'Hero-Titel-Farbe',
  'hero-subline': 'Hero-Subline-Farbe',
  'version-pill': 'Versions-Pill',
  'data-bg': 'Eckdaten-Block',
  'cta-bg': 'CTA-Bereich',
  'button': 'CTA-Button'
};

function buildSuggestionFromBrand(brand) {
  const primary = brand.primary || '#1A2949';
  const accent = brand.accent || '#f5a524';
  const bg = brand.bg || '#f5f5f7';
  return {
    'banner': accent,
    'hero-bg': primary,
    'hero-title': '#ffffff',
    'hero-subline': hexToRgba('#ffffff', 0.78),
    'version-pill': darken(primary, 0.15),
    'data-bg': '#0a0a0a',
    'cta-bg': '#ffffff',
    'button': accent,
    'pageBg': bg
  };
}

function restoreBrand() {
  let brand = loadJSON(KEYS.brand, null);
  if (!brand) {
    brand = {
      primary: '#1A2949',
      accent: '#f5a524',
      bg: '#f5f5f7',
      sections: {},
      logo: null
    };
    saveJSON(KEYS.brand, brand);
  }
  document.getElementById('primary-color').value = brand.primary || '#1A2949';
  document.getElementById('accent-color').value = brand.accent || '#f5a524';
  document.getElementById('bg-color').value = brand.bg || '#f5f5f7';
  document.getElementById('hex-primary').textContent = (brand.primary || '#1A2949').toUpperCase();
  document.getElementById('hex-accent').textContent = (brand.accent || '#f5a524').toUpperCase();
  document.getElementById('hex-bg').textContent = (brand.bg || '#f5f5f7').toUpperCase();
  document.getElementById('sw-primary').style.background = brand.primary || '#1A2949';
  document.getElementById('sw-accent').style.background = brand.accent || '#f5a524';
  document.getElementById('sw-bg').style.background = brand.bg || '#f5f5f7';

  if (brand.logo) {
    const img = document.getElementById('logo-preview');
    img.src = brand.logo;
    document.getElementById('logo-empty').style.display = 'none';
    document.getElementById('logo-loaded').style.display = 'block';
    document.getElementById('logo-uploader').classList.add('has-logo');
    document.getElementById('mp-logo').innerHTML = '<img src="' + brand.logo + '" alt="Logo">';
  }
  applyBrand(brand);
}

function applyBrand(brand) {
  const frame = document.getElementById('mp-frame');
  if (!frame) return;
  const suggestion = buildSuggestionFromBrand(brand);

  frame.style.setProperty('--mp-page-bg', brand.bg || '#f5f5f7');

  Object.keys(SECTION_VARS).forEach(section => {
    const cssVar = SECTION_VARS[section];
    const overridden = brand.sections && brand.sections[section];
    const value = overridden || suggestion[section];
    frame.style.setProperty(cssVar, value);
  });

  // Auto-Kontrast für Texte
  frame.style.setProperty('--mp-versionspill-text', getReadableText((brand.sections && brand.sections['version-pill']) || suggestion['version-pill']));
  frame.style.setProperty('--mp-banner-text', getReadableText((brand.sections && brand.sections['banner']) || suggestion['banner']));
  const ctaBg = (brand.sections && brand.sections['cta-bg']) || suggestion['cta-bg'];
  frame.style.setProperty('--mp-cta-text', getReadableText(ctaBg));
  frame.style.setProperty('--mp-button-text', getReadableText((brand.sections && brand.sections['button']) || suggestion['button']));
  const dataBg = (brand.sections && brand.sections['data-bg']) || suggestion['data-bg'];
  frame.style.setProperty('--mp-data-text', getReadableText(dataBg));
  frame.style.setProperty('--mp-data-label', hexToRgba(getReadableText(dataBg), 0.55));

  // Hero-Sub-Text-Soft-Farbe (für „Erstellt am" / „Gültig bis" labels)
  const heroBg = (brand.sections && brand.sections['hero-bg']) || suggestion['hero-bg'];
  const heroText = (brand.sections && brand.sections['hero-title']) || suggestion['hero-title'];
  frame.style.setProperty('--mp-hero-text-soft', hexToRgba(heroText.startsWith('rgba') ? '#ffffff' : heroText, 0.55));
  // Linie zwischen Hero-Meta-Blocks
  frame.style.setProperty('--mp-line', hexToRgba(heroText.startsWith('rgba') ? '#ffffff' : heroText, 0.15));

  updateSidebarSectionDots(brand);
}

function updateSidebarSectionDots(brand) {
  const suggestion = buildSuggestionFromBrand(brand);
  document.querySelectorAll('.section-item[data-section]').forEach(item => {
    const section = item.dataset.section;
    const dot = item.querySelector('.section-color-dot');
    const value = (brand.sections && brand.sections[section]) || suggestion[section];
    if (dot && value) {
      // Falls rgba (für hero-subline), als Hintergrund setzen
      dot.style.background = value;
    }
  });
}

function updateBrandColor(which, hex) {
  const brand = loadJSON(KEYS.brand, {});
  brand[which] = hex;
  saveJSON(KEYS.brand, brand);
  document.getElementById('hex-' + which).textContent = hex.toUpperCase();
  document.getElementById('sw-' + which).style.background = hex;
  applyBrand(brand);
}

function generateSuggestion() {
  const brand = loadJSON(KEYS.brand, {});
  brand.sections = {};
  saveJSON(KEYS.brand, brand);
  applyBrand(brand);
  showToast('Neuer Vorschlag generiert.', 'success');
}

// ============ LOGO UPLOAD ============
function bindLogoUpload() {
  const input = document.getElementById('logo-file');
  if (!input) return;
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast('Logo zu groß — max. 1 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const brand = loadJSON(KEYS.brand, {});
      brand.logo = dataUrl;
      saveJSON(KEYS.brand, brand);
      document.getElementById('logo-preview').src = dataUrl;
      document.getElementById('logo-empty').style.display = 'none';
      document.getElementById('logo-loaded').style.display = 'block';
      document.getElementById('logo-uploader').classList.add('has-logo');
      document.getElementById('mp-logo').innerHTML = '<img src="' + dataUrl + '" alt="Logo">';
      showToast('Logo hochgeladen.', 'success');
    };
    reader.readAsDataURL(file);
  });

  const uploader = document.getElementById('logo-uploader');
  if (uploader) {
    uploader.addEventListener('dragover', (e) => { e.preventDefault(); uploader.style.borderColor = 'var(--gold)'; });
    uploader.addEventListener('dragleave', () => { uploader.style.borderColor = ''; });
    uploader.addEventListener('drop', (e) => {
      e.preventDefault();
      uploader.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  }
}

function removeLogo() {
  const brand = loadJSON(KEYS.brand, {});
  brand.logo = null;
  saveJSON(KEYS.brand, brand);
  document.getElementById('logo-empty').style.display = 'block';
  document.getElementById('logo-loaded').style.display = 'none';
  document.getElementById('logo-uploader').classList.remove('has-logo');
  document.getElementById('mp-logo').innerHTML = '<span>LOGO</span>';
}

// ============ COLOR PICKER ============
function openSectionPicker(section, event) {
  if (event) event.stopPropagation();
  editingSection = section;
  const picker = document.getElementById('color-picker');
  document.getElementById('picker-title').textContent = SECTION_LABELS[section] || section;

  document.querySelectorAll('.section-item').forEach(i => i.classList.toggle('editing', i.dataset.section === section));
  document.querySelectorAll('.mp-section').forEach(s => s.classList.toggle('editing', s.dataset.section === section));

  const brand = loadJSON(KEYS.brand, {});
  const quicks = [
    { color: brand.primary || '#1A2949', label: 'Haupt' },
    { color: brand.accent || '#f5a524', label: 'Zusatz' },
    { color: brand.bg || '#f5f5f7', label: 'Hinterg.' },
    { color: '#ffffff', label: 'Weiß' },
    { color: '#0a0a0a', label: 'Schwarz' }
  ];
  const currentValue = (brand.sections && brand.sections[section]) || buildSuggestionFromBrand(brand)[section] || '#000000';
  const currentNorm = normalizeHex(currentValue);
  document.getElementById('picker-quicks').innerHTML = quicks.map(q => {
    const active = normalizeHex(q.color).toLowerCase() === currentNorm.toLowerCase() ? 'active' : '';
    return '<div class="picker-quick ' + active + '" style="background:' + q.color + ';" onclick="applyColor(\'' + q.color + '\')" title="' + q.label + '"><span class="picker-quick-label">' + q.label + '</span></div>';
  }).join('');

  document.getElementById('picker-custom-hex').value = currentNorm.toUpperCase();
  document.getElementById('picker-custom-color').value = currentNorm;

  positionPicker(event);
  picker.classList.add('open');
}

function positionPicker(event) {
  const picker = document.getElementById('color-picker');
  const PICKER_W = 280;
  const PICKER_H = 230;
  let top = window.innerHeight / 2 - PICKER_H / 2;
  let left = window.innerWidth / 2 - PICKER_W / 2;

  if (event && event.clientX) {
    top = Math.min(event.clientY + 12, window.innerHeight - PICKER_H - 20);
    left = Math.min(event.clientX, window.innerWidth - PICKER_W - 20);
    if (top < 20) top = 20;
    if (left < 20) left = 20;
  } else {
    const item = document.querySelector('.section-item.editing');
    if (item) {
      const rect = item.getBoundingClientRect();
      top = Math.min(rect.top, window.innerHeight - PICKER_H - 20);
      left = Math.min(rect.right + 12, window.innerWidth - PICKER_W - 20);
      if (top < 20) top = 20;
    }
  }
  picker.style.top = top + 'px';
  picker.style.left = left + 'px';
}

function applyColor(hex) {
  if (!editingSection) return;
  const brand = loadJSON(KEYS.brand, {});
  brand.sections = brand.sections || {};
  brand.sections[editingSection] = hex;
  saveJSON(KEYS.brand, brand);
  applyBrand(brand);
  document.getElementById('picker-custom-hex').value = hex.toUpperCase();
  document.getElementById('picker-custom-color').value = normalizeHex(hex);
  // Quick-Active-State updaten
  document.querySelectorAll('.picker-quick').forEach(q => {
    const qHex = rgbStringToHex(q.style.background);
    q.classList.toggle('active', qHex.toLowerCase() === normalizeHex(hex).toLowerCase());
  });
}

function bindPickerInputs() {
  const customColor = document.getElementById('picker-custom-color');
  const customHex = document.getElementById('picker-custom-hex');
  if (customColor) {
    customColor.addEventListener('input', (e) => applyColor(e.target.value));
  }
  if (customHex) {
    customHex.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v);
    });
  }
}

function resetSection() {
  if (!editingSection) return;
  const brand = loadJSON(KEYS.brand, {});
  if (brand.sections) delete brand.sections[editingSection];
  saveJSON(KEYS.brand, brand);
  applyBrand(brand);
  const reverted = buildSuggestionFromBrand(brand)[editingSection];
  if (reverted) {
    document.getElementById('picker-custom-hex').value = normalizeHex(reverted).toUpperCase();
    document.getElementById('picker-custom-color').value = normalizeHex(reverted);
  }
  showToast('Auf Vorschlag zurückgesetzt.', 'success');
}

function closePicker() {
  const picker = document.getElementById('color-picker');
  if (picker) picker.classList.remove('open');
  document.querySelectorAll('.section-item.editing').forEach(i => i.classList.remove('editing'));
  document.querySelectorAll('.mp-section.editing').forEach(s => s.classList.remove('editing'));
  editingSection = null;
}

// ============ PREVIEW MODE TOGGLE ============
function bindPreviewModeToggle() {
  document.querySelectorAll('.preview-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preview-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const frame = document.getElementById('mp-frame');
      if (btn.dataset.mode === 'mobile') {
        frame.style.maxWidth = '380px';
        frame.style.margin = '0 auto';
      } else {
        frame.style.maxWidth = '';
        frame.style.margin = '';
      }
    });
  });
}

// ============ STEP 2 COMPLETE ============
function completeStep2() {
  markStepDone(2);
  showToast('Erscheinung gespeichert.', 'success');
  setTimeout(() => goToStep(3), 400);
}

// ============ NAVIGATION ============
function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  closePicker();
  currentStep = n;
  document.querySelectorAll('.ob-step-screen').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step, 10) === n);
  });
  document.querySelectorAll('.ob-step-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.step, 10) === n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateSidebarStatus();
}

function updateSidebarStatus() {
  const status = loadStatus();
  document.querySelectorAll('.ob-step-item').forEach(item => {
    const n = parseInt(item.dataset.step, 10);
    const done = status.stepsDone.includes(n);
    item.classList.toggle('done', done && n !== currentStep);
    const meta = item.querySelector('.ob-step-meta');
    if (meta && done) meta.textContent = '✓ Erledigt';
  });
  const pct = (status.stepsDone.length / TOTAL_STEPS) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = status.stepsDone.length + ' / ' + TOTAL_STEPS + ' Schritte abgeschlossen';
}

// ============ RESET ============
function resetOnboarding() {
  if (!confirm('Onboarding-Daten zurücksetzen? Firmenangaben, Logo, Farben und Fortschritt werden entfernt. Account bleibt erhalten.')) return;
  ['df_company','df_brand','df_team','df_documents','df_onboarding'].forEach(k => localStorage.removeItem(k));
  location.reload();
}

// ============ TOAST ============
function showToast(msg, kind) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('error','success');
  if (kind) t.classList.add(kind);
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ============ COLOR UTILS ============
function normalizeHex(c) {
  if (!c) return '#000000';
  c = String(c).trim();
  if (c.startsWith('rgb')) return rgbStringToHex(c);
  if (c.length === 4 && c.startsWith('#')) return '#' + c[1]+c[1]+c[2]+c[2]+c[3]+c[3];
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  return '#000000';
}

function rgbStringToHex(rgb) {
  if (!rgb) return '#000000';
  const m = String(rgb).match(/\d+/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0,3).map(x => parseInt(x, 10).toString(16).padStart(2,'0')).join('');
}

function hexToRgba(hex, a) {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

function darken(hex, amount) {
  const h = normalizeHex(hex).slice(1);
  const r = Math.max(0, parseInt(h.slice(0,2), 16) - Math.round(amount * 255));
  const g = Math.max(0, parseInt(h.slice(2,4), 16) - Math.round(amount * 255));
  const b = Math.max(0, parseInt(h.slice(4,6), 16) - Math.round(amount * 255));
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

function getReadableText(bg) {
  if (!bg) return '#0a0a0a';
  // Wenn rgba/rgb übergeben → Hex umwandeln
  let hex = bg;
  if (String(bg).startsWith('rgb')) hex = rgbStringToHex(bg);
  hex = normalizeHex(hex);
  const h = hex.slice(1);
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  const yiq = (r*299 + g*587 + b*114) / 1000;
  return yiq >= 140 ? '#0a0a0a' : '#ffffff';
}
