import { stockholmDate, validSession } from './core.js';
export const VR_VERSION = '1.0.0';
export const VR_KEY = 'mond-rest-lab:vr:v1';
export const VR_CHECKS = ['linked','consent','fit','streams','scope','pilot','nativeStart','nativeEnd','rawSaved','quality','paired'];
export const EVENT_TYPES = ['STAGE_START','HAZARD_PRESENTED','HAZARD_IDENTIFIED','SAFETY_ERROR','HELP_REQUEST','PAUSE_START','PAUSE_END','MOVEMENT','SENSOR_ADJUSTMENT','SIGNAL_LOSS','DISCOMFORT','NOTE'];
export const METRICS = [
  { key:'hr', label:'Mean HR', unit:'bpm', positive:true },
  { key:'rmssd', label:'RMSSD', unit:'ms', positive:false },
  { key:'sdnn', label:'SDNN / SDRR', unit:'ms', positive:false },
  { key:'scl', label:'Mean tonic SCL', unit:'µS', positive:false },
  { key:'scr', label:'SCR rate', unit:'responses/min', positive:false }
];
export const TLX = ['mental','physical','temporal','performance','effort','frustration'];
export function freshVR(now = new Date()) {
  return {version:VR_VERSION,step:0,session:{participant:'E1',date:stockholmDate(now),run:'1',baseline:'',
    setup:'Not set',experience:'Not recorded',demoVersion:'',headset:'',postureRest:'Seated',baselineHeadset:'Not recorded',
    sensorPlacement:'Same ear and finger sites as baseline',recordingMode:'Separate VR recording',nativeId:'',mondFolder:'',
    sync:'Not verified',syncEvidence:'',actualSeconds:'',restStart:'',vrStart:'',restSeconds:'',vrSeconds:'',
    vrWindow:'VR_W01 (0–5 min)',qualityNotes:'',analysisSource:'',notes:'',safetyErrors:'',hazards:'',helpRequests:'',
    preStress:'',postStress:'',preValence:'',postValence:'',preArousal:'',postArousal:'',preDiscomfort:'',postDiscomfort:''},
    checks:{},timer:{startedAt:null,endedAt:null},events:[],tlx:Object.fromEntries(TLX.map(k=>[k,''])),
    metrics:Object.fromEntries(METRICS.map(m=>[m.key,{rest:'',vr:''}]))};
}
export function vrIdentifiers(s) {
  if (!validSession(s)) return null;
  const day=s.date.replaceAll('-','');
  return {participant:s.participant,study:`${s.participant}_HRV_GSR_VR_${day}`,session:`${s.participant}_VR_${day}_R${String(s.run).padStart(2,'0')}`};
}
export function baselineMatches(s) {
  if (!vrIdentifiers(s)) return false;
  const prefix=`${s.participant}_REST_`;
  if (!s.baseline.startsWith(prefix)) return false;
  const match=s.baseline.slice(prefix.length).match(/^(\d{4})(\d{2})(\d{2})_R(\d{2})$/);
  return !!match && validSession({participant:s.participant,date:`${match[1]}-${match[2]}-${match[3]}`,run:match[4]});
}
export function numeric(value, min=0, max=Infinity) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (String(value).trim()==='') return null;
  const n=Number(value); return Number.isFinite(n) && n>=min && n<=max ? n : null;
}
export function deltaPair(rest, vr, positive=false) {
  const b=numeric(rest),v=numeric(vr);
  if (b===null || v===null || (positive && (b===0 || v===0))) return null;
  return {rest:b,vr:v,delta:v-b,percent:b===0?null:(v-b)/b*100};
}
export function rawTLX(values) {
  const numbers=TLX.map(k=>numeric(values[k],0,100));
  return numbers.some(n=>n===null)?null:numbers.reduce((a,b)=>a+b,0)/6;
}
export function elapsedSeconds(timer, now=Date.now()) {
  if (!Number.isFinite(timer.startedAt)) return 0;
  return Math.max(0,Math.floor(((timer.endedAt??now)-timer.startedAt)/1000));
}
export function windowPlan(value) {
  const seconds=numeric(value,0,86400);
  if (seconds===null) return null;
  const count=Math.floor(seconds/300);
  return {seconds,fullWindows:count,tailSeconds:seconds-count*300,
    windows:Array.from({length:count},(_,i)=>({name:`VR_W${String(i+1).padStart(2,'0')}`,startSeconds:i*300,endSeconds:(i+1)*300,
      role:i===0?'Primary comparison':'Secondary within-participant window'}))};
}
export function restoreVR(value, now=new Date()) {
  const base=freshVR(now);
  if (!value || value.version!==VR_VERSION) return base;
  for (const k of Object.keys(base.session)) if (typeof value.session?.[k]==='string') base.session[k]=value.session[k].slice(0,5000);
  for (const k of VR_CHECKS) base.checks[k]=value.checks?.[k]===true;
  for (const k of TLX) if (typeof value.tlx?.[k]==='string') base.tlx[k]=value.tlx[k].slice(0,20);
  for (const {key} of METRICS) for (const phase of ['rest','vr']) if (typeof value.metrics?.[key]?.[phase]==='string') base.metrics[key][phase]=value.metrics[key][phase].slice(0,30);
  if (Number.isInteger(value.step) && value.step>=0 && value.step<5) base.step=value.step;
  const t=value.timer;
  if (t && Number.isFinite(t.startedAt) && t.startedAt>0 && (t.endedAt===null || (Number.isFinite(t.endedAt) && t.endedAt>=t.startedAt))) base.timer={startedAt:t.startedAt,endedAt:t.endedAt};
  if (Array.isArray(value.events)) base.events=value.events.filter(e=>e && [...EVENT_TYPES,'VR_START','VR_END'].includes(e.type) &&
    typeof e.utc==='string' && Number.isFinite(Date.parse(e.utc)) && Number.isFinite(e.elapsed_seconds) && e.elapsed_seconds>=0 && typeof e.note==='string')
    .slice(-2000).map(e=>({type:e.type,utc:e.utc,elapsed_seconds:e.elapsed_seconds,note:e.note.slice(0,2000),clock:'browser_wall_clock_unverified'}));
  return base;
}
export function comparisonStatus(s, checks) {
  const reasons=[];
  if (!baselineMatches(s)) reasons.push('Link a baseline from the same participant.');
  if (numeric(s.restSeconds)!==300 || numeric(s.vrSeconds)!==300) reasons.push('Confirm two 300-second analysis windows.');
  const windowEnd={'VR_W01 (0–5 min)':300,'VR_W02 (5–10 min)':600,'VR_W03 (10–15 min)':900}[s.vrWindow];
  const taskSeconds=numeric(s.actualSeconds,0,86400);
  if (taskSeconds===null || (windowEnd!==undefined && taskSeconds<windowEnd)) reasons.push('Verify that the native task duration contains the selected full window.');
  if (!s.analysisSource.trim() || !s.restStart.trim() || !s.vrStart.trim()) reasons.push('Record the calculation source and both native window starts.');
  if (!s.qualityNotes.trim()) reasons.push('Document signal retention, gaps and completeness for both phases.');
  if (!checks.quality || !checks.paired) reasons.push('Complete the signal-quality and matched-method checks.');
  if (s.sync!=='Verified from native events / clock mapping') reasons.push('Verify native event boundaries and clock mapping.');
  if (!s.syncEvidence.trim()) reasons.push('Record the native timing / clock-mapping evidence.');
  return reasons;
}
export function vrExport(state, now=new Date()) {
  const ids=vrIdentifiers(state.session); if (!ids) throw new Error('Enter a valid participant code, date and run.');
  const metrics=METRICS.map(m=>({...m,...(deltaPair(state.metrics[m.key].rest,state.metrics[m.key].vr,m.positive)||{}),
    entered:{...state.metrics[m.key]}}));
  const rmssd=deltaPair(state.metrics.rmssd.rest,state.metrics.rmssd.vr,true);
  return {guide:'MOND Rest Lab — VR experiment',guide_version:VR_VERSION,exported_at_utc:now.toISOString(),...ids,
    details:{...state.session},baseline_link_same_participant:baselineMatches(state.session),
    protocol:{expected_vr_minutes:[10,15],automatic_stop:false,primary:'REST_300s versus VR_START + [0,300) seconds',
      secondary:'Subsequent non-overlapping 300-second windows; retain shorter tail separately.',
      data_source:'Manual operator entries. No physiological samples are acquired or analysed by this page.',
      mond_policy:'Keep the same processing version and 25% / 100 ms exploratory timing policy as baseline; do not tune to produce an effect.',
      outcome:'Descriptive within-participant change; not a stress, workload or emotion classifier.'},
    checklist:Object.fromEntries(VR_CHECKS.map(k=>[k,state.checks[k]===true])),
    browser_operator_log:{...state.timer,elapsed_seconds:elapsedSeconds(state.timer,+now),
      running:state.timer.startedAt!==null && state.timer.endedAt===null,events:[...state.events],
      clock:'Unverified computer wall clock; not iMotions/LSL events. Pauses remain in elapsed time.'},
    native_duration_plan:windowPlan(state.session.actualSeconds),
    ratings:{tlx_items:{...state.tlx},raw_tlx_mean:rawTLX(state.tlx),
      scoring:'Unweighted six-item mean. Performance: 0=perfect, 100=failure. Not weighted NASA-TLX.',
      brief_items:'Stress 0–10, valence 1–9, arousal 1–9, discomfort 0–10 are ad hoc ratings, not validated composite scales.'},
    comparison:{verification_gaps:comparisonStatus(state.session,state.checks),metrics,
      delta_ln_rmssd:rmssd?Math.log(rmssd.vr/rmssd.rest):null,
      status:'Arithmetic on manually supplied summaries; quality checks are self-reported, not independently verified.'}};
}
export function csvCell(v) {
  let text=v===null || v===undefined?'':String(v);
  if (typeof v==='string' && /^[\s]*[=+@-]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function eventsCSV(record) {
  const header=['participant','session','baseline_session','event','browser_utc_unverified','browser_elapsed_seconds','note','clock_status'];
  const rows=record.browser_operator_log.events.map(e=>[record.participant,record.session,record.details.baseline,e.type,e.utc,e.elapsed_seconds,e.note,e.clock]);
  return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function comparisonCSV(record) {
  const header=['participant','session','baseline_session','VR_window','metric','unit','rest','vr','vr_minus_rest','percent_change','verification_gaps','source'];
  return [header,...record.comparison.metrics.map(m=>[record.participant,record.session,record.details.baseline,record.details.vrWindow,m.label,m.unit,m.rest,m.vr,m.delta,m.percent,record.comparison.verification_gaps.join(' | '),record.details.analysisSource])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
