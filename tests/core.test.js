import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, freshState, identifiers, validSession, timerView, restoreState, sessionExport, exportText, stockholmDate } from '../core.js';
test('E1 identifiers preserve the date and distinguish repeated attempts', () => {
  const state = freshState(new Date('2026-10-24T12:00:00Z'));
  assert.equal(identifiers(state.session).session, 'E1_REST_20261024_R01');
  state.session.run = '2'; assert.equal(identifiers(state.session).session, 'E1_REST_20261024_R02');
  assert.equal(CHECKS.flat().length, 18);
});
test('Stockholm dates handle local midnight and winter daylight offset', () => {
  assert.equal(stockholmDate(new Date('2026-10-24T22:30:00Z')), '2026-10-25');
  assert.equal(stockholmDate(new Date('2026-10-25T22:30:00Z')), '2026-10-25');
});
test('invalid IDs, calendar dates and run numbers cannot become export filenames', () => {
  const s = freshState().session;
  for (const participant of ['../E1','<script>','E 1','','=SUM(1)']) assert.equal(validSession({...s,participant}), false);
  for (const date of ['2026-02-30','2026-13-01','2026-1-2','']) assert.equal(validSession({...s,date}), false);
  for (const run of ['0','100','1.5','x']) assert.equal(validSession({...s,run}), false);
  assert.equal(identifiers({...s,participant:'../E1'}),null);
});
test('rehearsal changes phase at exactly 300 seconds and completes at 600', () => {
  const t = {phaseSeconds:300,elapsedMs:0,startedAt:1000,status:'running'};
  assert.equal(timerView(t,300999).phase,'warmup'); assert.equal(timerView(t,300999).remainingSeconds,1);
  assert.equal(timerView(t,301000).phase,'rest'); assert.equal(timerView(t,301000).remainingSeconds,300);
  assert.equal(timerView(t,601000).done,true); assert.equal(timerView(t,1000000).fraction,1);
});
test('a paused rehearsal does not advance; reload can catch up from a start time', () => {
  const paused = {phaseSeconds:30,elapsedMs:15000,startedAt:null,status:'paused'};
  assert.equal(timerView(paused,10000000).elapsed,15000);
  const state=freshState(); state.timer={...paused,startedAt:1000,status:'running'};
  assert.equal(timerView(restoreState(state).timer,16000).phase,'rest');
});
test('corrupt persisted state is bounded and cannot invent checklist completion', () => {
  const state = restoreState({version:'1.0.0',step:99,checks:{identity:'true'}, observations:[null,{}, {text:7}], timer:{status:'running'}});
  assert.equal(state.step,0); assert.equal(state.checks.identity,false); assert.deepEqual(state.observations,[]); assert.equal(state.timer.status,'idle');
});
test('downloads separate planned protocol, operator checks, practice and acquisition evidence', () => {
  const state=freshState(); state.checks.saved=true; state.timer.phaseSeconds=30;
  const record=sessionExport(state);
  assert.equal(record.planned_protocol.rest_seconds,300); assert.equal(record.browser_rehearsal.phase_seconds,30);
  assert.equal(Object.keys(record.operator_checklist).length,18); assert.equal(record.operator_checklist.identity,false);
  assert.match(record.acquisition_status,/Unverified/); assert.match(exportText(record),/not sensor event markers/);
  assert.doesNotThrow(()=>JSON.parse(JSON.stringify(record)));
});
