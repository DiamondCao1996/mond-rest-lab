export const VERSION = '1.0.0';
export const STORAGE_KEY = 'mond-rest-lab:v1';
export const CHECKS = [
  ['identity'],
  ['ear', 'fingers', 'undocked', 'resting'],
  ['settings', 'mondLive', 'lsl', 'gsrLive'],
  ['slides', 'timestamp', 'respondent'],
  ['preview', 'saved'],
  ['native', 'source', 'events', 'coverage']
];
export function stockholmDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function validSession(s) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(s.participant || '')) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date || '')) return false;
  const date = new Date(`${s.date}T12:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === s.date &&
    Number.isInteger(Number(s.run)) && Number(s.run) >= 1 && Number(s.run) <= 99;
}
export function identifiers(s) {
  if (!validSession(s)) return null;
  const date = s.date.replaceAll('-', '');
  return { participant: s.participant, study: `${s.participant}_HRV_GSR_REST_${date}`,
    session: `${s.participant}_REST_${date}_R${String(s.run).padStart(2, '0')}` };
}
export function freshState(now = new Date()) {
  return { version: VERSION, step: 0, checks: {}, observations: [],
    session: { participant: 'E1', date: stockholmDate(now), run: '1',
      ear: 'Left', hand: 'Non-dominant', eyes: 'Open, fixation',
      posture: 'Seated, back and arms supported', mondFolder: '', imotionsId: '', notes: '' },
    timer: { phaseSeconds: 300, elapsedMs: 0, startedAt: null, status: 'idle' } };
}
export function timerView(timer, now = Date.now()) {
  const total = timer.phaseSeconds * 2 * 1000;
  const elapsed = Math.min(total, Math.max(0, timer.elapsedMs +
    (timer.status === 'running' && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0)));
  const done = elapsed >= total;
  const phase = done ? 'complete' : elapsed >= total / 2 ? 'rest' : 'warmup';
  const remaining = Math.max(0, (phase === 'warmup' ? total / 2 : total) - elapsed);
  return { elapsed, done, phase, remainingSeconds: Math.ceil(remaining / 1000), fraction: elapsed / total };
}
export function clockLabel(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function restoreState(value, now = new Date()) {
  const base = freshState(now);
  if (!value || value.version !== VERSION) return base;
  if (value.session && typeof value.session === 'object') {
    for (const key of Object.keys(base.session)) {
      if (typeof value.session[key] === 'string') base.session[key] = value.session[key].slice(0, key === 'notes' ? 5000 : 300);
    }
  }
  base.step = Number.isInteger(value.step) && value.step >= 0 && value.step < 6 ? value.step : 0;
  for (const key of CHECKS.flat()) base.checks[key] = value.checks?.[key] === true;
  if (Array.isArray(value.observations)) base.observations = value.observations.filter(x =>
    x && typeof x.text === 'string' && typeof x.noted_at_utc === 'string' &&
    ['setup', 'warmup', 'rest', 'after'].includes(x.phase)).slice(-100).map(x => ({
      text: x.text.slice(0, 1000), noted_at_utc: x.noted_at_utc.slice(0, 40), phase: x.phase
    }));
  const t = value.timer;
  if (t && [30, 300].includes(t.phaseSeconds) && ['idle', 'running', 'paused', 'complete'].includes(t.status)
      && Number.isFinite(t.elapsedMs) && t.elapsedMs >= 0 && t.elapsedMs <= t.phaseSeconds * 2000
      && (t.startedAt === null || Number.isFinite(t.startedAt))
      && (t.status !== 'running' || Number.isFinite(t.startedAt))) base.timer = { ...t };
  return base;
}
export function sessionExport(state, now = new Date()) {
  const ids = identifiers(state.session);
  if (!ids) throw new Error('Enter a valid participant ID, date and run number.');
  return { guide_version: VERSION, exported_at_utc: now.toISOString(), timezone: 'Europe/Stockholm',
    ...ids, session_details: { ...state.session },
    planned_protocol: { warmup_seconds: 300, rest_seconds: 300,
      rest_phase: 'REST_300s', warmup_phase: 'WARMUP_300s', gsr_sample_rate_hz: 128,
      mond_timing: { percentage: 25, absolute_floor_ms: 100, independently_validated_optimum: false },
      streams: ['MOND_HRV', 'Shimmer GSR'], optional_stream: 'MOND_HRV_QUALITY' },
    operator_checklist: Object.fromEntries(CHECKS.flat().map(key => [key, state.checks[key] === true])), manual_observations: [...state.observations],
    browser_rehearsal: { ...timerView(state.timer, +now), phase_seconds: state.timer.phaseSeconds,
      status: state.timer.status, purpose: 'Practice only; not linked to iMotions or sensors.' },
    acquisition_status: 'Unverified. This guide cannot start, monitor or verify sensor recording.',
    timing_note: 'Use native iMotions REST_300s event boundaries and verified clock mapping. Browser note times are not sensor event markers.',
    provenance_note: '25% with a 100 ms floor is the selected exploratory MOND policy, not a universal accuracy threshold.' };
}
export function exportText(record) {
  return `MOND REST LAB - SESSION COLLECTION LOG\n\nSession: ${record.session}\nParticipant: ${record.participant}\nStudy: ${record.study}\nDate: ${record.session_details.date}\nTimezone: ${record.timezone}\nExported (UTC): ${record.exported_at_utc}\n\nPLANNED PROTOCOL\nWARMUP_300s: 300 seconds, excluded from baseline.\nREST_300s: 300 seconds, analysed baseline.\nMOND timing tolerance: 25%, 100 ms floor. GSR: 128 Hz.\n\nSESSION DETAILS\n${Object.entries(record.session_details).map(([k,v]) => `${k}: ${v}`).join('\n')}\n\nOPERATOR CHECKLIST (self-reported)\n${Object.entries(record.operator_checklist).map(([k,v]) => `${v ? '[x]' : '[ ]'} ${k}`).join('\n')}\n\nMANUAL OBSERVATIONS (not sensor event markers)\n${record.manual_observations.map(x => `${x.noted_at_utc} | ${x.phase} | ${x.text}`).join('\n') || 'No observations entered.'}\n\nRECORDING STATUS\n${record.acquisition_status}\n${record.timing_note}\n${record.provenance_note}\n\nThe browser timer is a rehearsal aid. Actual recording duration and quality must be checked in the original iMotions and MOND files.\n`;
}
