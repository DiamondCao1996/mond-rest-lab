import { STORAGE_KEY, CHECKS, freshState, restoreState, identifiers, timerView, clockLabel, sessionExport, exportText } from './core.js';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let state = freshState();
let storageOK = true;
try { state = restoreState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { storageOK = false; }
let toastTimeout;
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
  $('#storage-note').textContent = storageOK ? 'Draft saved on this browser. No sensor data are uploaded.' : 'Browser storage is unavailable. Download your notes before leaving.';
}
function renderIdentity() {
  const ids = identifiers(state.session);
  $('#identity-error').hidden = !!ids;
  $('#study-name').textContent = ids?.study || 'Complete valid session details above';
  $('#session-name').textContent = ids?.session || '—';
  $('#folder-root').textContent = ids?.session || 'SESSION';
  $('#rail-session').textContent = ids?.session || 'Check session details';
  $('#rail-participant').textContent = state.session.participant || '—';
  $$('[data-participant]').forEach(el => { el.textContent = state.session.participant || 'your participant'; });
  $$('[data-copy]').forEach(el => { el.disabled = !ids; });
  const participantOK = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(state.session.participant);
  $('#participant').setAttribute('aria-invalid', String(!participantOK));
}
function renderProgress() {
  const total = CHECKS.flat().length;
  const completed = CHECKS.flat().filter(key => state.checks[key]).length;
  $('#progress').max = total; $('#progress').value = completed;
  $('#progress').textContent = `${completed} of ${total}`;
  $('#progress').setAttribute('aria-label', `${completed} of ${total} checklist items completed`);
  $('#progress-label').textContent = `${completed} / ${total}`;
  $$('#step-nav a').forEach((a, index) => {
    const done = CHECKS[index].every(key => state.checks[key]);
    a.querySelector('.nav-check').textContent = done ? '✓' : '';
    a.setAttribute('aria-label', `${index + 1}. ${a.querySelector('span:nth-child(2)').firstChild.textContent}${done ? ', checklist complete' : ''}`);
  });
}
const nextLabels = ['Fit your sensors', 'Connect both streams', 'Build the study', 'Rehearse & record', 'Save & verify', 'Download notes'];
function showStep(index, focus = false) {
  state.step = index;
  $$('.step-panel').forEach((p, i) => { p.hidden = i !== index; });
  $$('#step-nav a').forEach((a, i) => { if (i === index) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  if (window.innerWidth <= 850) $$('#step-nav a')[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#previous').disabled = index === 0;
  $('#next').textContent = `${nextLabels[index]} ${index === 5 ? '↓' : '→'}`;
  $('#step-count').textContent = `STEP ${String(index + 1).padStart(2, '0')} OF 06`;
  if (focus) { $('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  save();
}
function hashStep() {
  const match = location.hash.match(/^#step-([1-6])$/);
  return match ? Number(match[1]) - 1 : null;
}
function go(index) { location.hash = `step-${index + 1}`; }
window.addEventListener('hashchange', () => { const step = hashStep(); if (step !== null) showStep(step, true); });
$('#previous').addEventListener('click', () => go(Math.max(0, state.step - 1)));
$('#next').addEventListener('click', () => state.step === 5 ? downloadRecord('txt') : go(state.step + 1));
$$('[data-field]').forEach(input => {
  input.value = state.session[input.dataset.field];
  input.addEventListener('input', () => {
    state.session[input.dataset.field] = input.value;
    renderIdentity(); save();
  });
});
$$('[data-check]').forEach(input => {
  input.checked = state.checks[input.dataset.check] === true;
  input.addEventListener('change', () => { state.checks[input.dataset.check] = input.checked; renderProgress(); save(); });
});
$$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const ids = identifiers(state.session); if (!ids) return;
  try { await navigator.clipboard.writeText(ids[button.dataset.copy]); toast('Copied to clipboard.'); }
  catch { toast('Clipboard unavailable. Select and copy the displayed label.'); }
}));
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function downloadRecord(format) {
  try {
    const record = sessionExport(state);
    const content = format === 'json' ? JSON.stringify(record, null, 2) : exportText(record);
    downloadBlob(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' }), `${record.session}_session_notes.${format}`);
    toast('Collection log downloaded. Export the sensor data separately in iMotions.');
  } catch (error) { go(0); toast(error.message); }
}
$('#download-top').addEventListener('click', () => downloadRecord('txt'));
$('#download-txt').addEventListener('click', () => downloadRecord('txt'));
$('#download-json').addEventListener('click', () => downloadRecord('json'));
$('#download-fixation').addEventListener('click', () => {
  const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#a6a6a6'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.strokeStyle = '#242424'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(938, 540); ctx.lineTo(982, 540); ctx.moveTo(960, 518); ctx.lineTo(960, 562); ctx.stroke();
  canvas.toBlob(blob => { if (blob) { downloadBlob(blob, 'neutral_fixation.png'); toast('Add this PNG twice in Study builder: WARMUP_300s, then REST_300s.'); } }, 'image/png');
});
function renderTimer() {
  const view = timerView(state.timer);
  if (view.done && state.timer.status !== 'complete') { state.timer.elapsedMs = view.elapsed; state.timer.startedAt = null; state.timer.status = 'complete'; save(); toast('Rehearsal complete. Check iMotions separately for actual recording status.'); }
  const running = state.timer.status === 'running';
  $('#timer-clock').textContent = clockLabel(view.remainingSeconds);
  $('#timer-clock').setAttribute('aria-label', `${view.phase} practice time remaining: ${clockLabel(view.remainingSeconds)}`);
  $('#timer-phase').textContent = view.done ? 'REHEARSAL COMPLETE' : `${view.phase === 'warmup' ? 'WARM-UP' : 'REST'} / ${running ? 'PRACTISING' : state.timer.status === 'paused' ? 'PAUSED' : 'READY'}`;
  $('#timer-instruction').textContent = view.done ? 'Practice finished. This is not confirmation of sensor data collection.' : view.phase === 'warmup' ? 'Settle into your resting position. Breathe naturally.' : 'Keep the same position. The real baseline is defined by iMotions.';
  $('#timer-bar').style.width = `${view.fraction * 100}%`;
  $('#timer-start').textContent = running ? 'Pause rehearsal' : view.done ? 'Rehearse again' : state.timer.status === 'paused' ? 'Resume rehearsal' : 'Start rehearsal';
  $('#timer-mode').disabled = running || state.timer.status === 'paused';
  $('#timer-mode').value = String(state.timer.phaseSeconds);
  const duration = state.timer.phaseSeconds === 300 ? '5 min' : '30 sec (practice)';
  $('#warmup-duration').textContent = `Warm-up · ${duration}`; $('#rest-duration').textContent = `Rest · ${duration}`;
}
$('#timer-start').addEventListener('click', () => {
  const view = timerView(state.timer);
  if (state.timer.status === 'running') { state.timer.elapsedMs = view.elapsed; state.timer.startedAt = null; state.timer.status = 'paused'; }
  else { if (view.done) state.timer.elapsedMs = 0; state.timer.startedAt = Date.now(); state.timer.status = 'running'; }
  save(); renderTimer();
});
$('#timer-reset').addEventListener('click', () => { state.timer = { phaseSeconds: state.timer.phaseSeconds, elapsedMs: 0, startedAt: null, status: 'idle' }; save(); renderTimer(); });
$('#timer-mode').addEventListener('change', event => { state.timer = { phaseSeconds: Number(event.target.value), elapsedMs: 0, startedAt: null, status: 'idle' }; save(); renderTimer(); });
setInterval(renderTimer, 250);
document.addEventListener('visibilitychange', renderTimer);
function renderObservations() {
  $('#observation-list').replaceChildren(...state.observations.map(x => {
    const li = document.createElement('li'); li.textContent = `${x.noted_at_utc} · ${x.phase} · ${x.text}`; return li;
  }));
}
function addObservation() {
  const text = $('#observation-text').value.trim();
  if (!text) { toast('Enter a short observation first.'); $('#observation-text').focus(); return; }
  if (state.observations.length >= 100) { toast('This log has 100 observations. Download it before starting a fresh checklist.'); return; }
  state.observations.push({ noted_at_utc: new Date().toISOString(), phase: $('#observation-phase').value, text });
  $('#observation-text').value = ''; save(); renderObservations(); toast('Observation saved in this browser draft.');
}
$('#add-observation').addEventListener('click', addObservation);
$('#observation-text').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addObservation(); } });
function resetDraft() {
  $('#reset-dialog').showModal();
}
function confirmReset() {
  $('#reset-dialog').close();
  const current = state.session;
  state = freshState(); state.session.participant = current.participant;
  state.session.run = String(Math.min(99, (Number(current.run) || 0) + 1));
  $$('[data-field]').forEach(input => { input.value = state.session[input.dataset.field]; });
  $$('[data-check]').forEach(input => { input.checked = false; });
  renderIdentity(); renderProgress(); renderObservations(); renderTimer(); save(); go(0); showStep(0, true);
  toast('Fresh checklist created. Confirm the new date and run number.');
}
$('#reset-draft').addEventListener('click', resetDraft);
$('#reset-draft-footer').addEventListener('click', resetDraft);
$('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
$('#confirm-reset').addEventListener('click', confirmReset);
renderIdentity(); renderProgress(); renderObservations(); renderTimer(); showStep(hashStep() ?? state.step);
