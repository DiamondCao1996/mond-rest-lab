import test from 'node:test';
import assert from 'node:assert/strict';
import {freshVR,vrIdentifiers,baselineMatches,windowPlan,deltaPair,rawTLX,elapsedSeconds,restoreVR,comparisonStatus,vrExport,eventsCSV,comparisonCSV,csvCell} from '../experiment-core.js';
const date=new Date('2026-10-24T10:00:00Z');
test('VR recordings have distinct IDs and cannot silently pair different participants',()=>{
 const s=freshVR(date).session;
 assert.equal(vrIdentifiers(s).session,'E1_VR_20261024_R01');
 assert.equal(baselineMatches(s),false);
 s.baseline='E1_REST_20261023_R02';assert.equal(baselineMatches(s),true);
 for(const id of ['E2_REST_20261024_R01','E1_REST_20260230_R01','E1_REST_20261024_R00']){s.baseline=id;assert.equal(baselineMatches(s),false);}
});
test('participant-paced durations retain extra windows and do not stretch a partial tail',()=>{
 assert.equal(windowPlan(''),null);assert.equal(windowPlan('-1'),null);
 assert.equal(windowPlan('299').fullWindows,0);
 assert.deepEqual(windowPlan('750').windows.map(x=>[x.startSeconds,x.endSeconds]),[[0,300],[300,600]]);
 assert.equal(windowPlan('750').tailSeconds,150);
 assert.equal(windowPlan('900').tailSeconds,0);
 assert.equal(windowPlan('1200').fullWindows,4);
});
test('within-person changes use the correct baseline and preserve zero and missingness',()=>{
 assert.deepEqual(deltaPair('50','40',true),{rest:50,vr:40,delta:-10,percent:-20});
 assert.deepEqual(deltaPair('0','2'),{rest:0,vr:2,delta:2,percent:null});
 for(const v of ['', ' ', '-2','abc','Infinity'])assert.equal(deltaPair(v,'1'),null);
 assert.equal(deltaPair('0','1',true),null);
 const s=freshVR();s.metrics.rmssd={rest:'0',vr:'5'};const r=vrExport(s);
 assert.equal(r.comparison.metrics.find(m=>m.key==='rmssd').delta,5);assert.equal(r.comparison.delta_ln_rmssd,null);
});
test('raw TLX requires all six valid dimensions and does not invent missing zero ratings',()=>{
 const values={mental:'60',physical:'30',temporal:'40',performance:'20',effort:'50',frustration:'40'};
 assert.equal(rawTLX(values),40);assert.equal(rawTLX({...values,mental:''}),null);assert.equal(rawTLX({...values,mental:'101'}),null);
 assert.equal(rawTLX(Object.fromEntries(Object.keys(values).map(k=>[k,'0']))),0);
});
test('operator clock survives reload and runs beyond 15 minutes without a cutoff',()=>{
 const s=freshVR();s.timer={startedAt:1000,endedAt:null};
 assert.equal(elapsedSeconds(restoreVR(s).timer,1201000),1200);
 s.timer.endedAt=1251000;assert.equal(elapsedSeconds(s.timer,2000000),1250);
 assert.equal(elapsedSeconds({startedAt:null,endedAt:null}),0);
});
test('quality status cannot be completed by ticking boxes alone',()=>{
 const s=freshVR(date);s.checks.quality=true;s.checks.paired=true;
 assert.ok(comparisonStatus(s.session,s.checks).length);
 Object.assign(s.session,{baseline:'E1_REST_20261024_R01',restSeconds:'300',vrSeconds:'300',restStart:'native REST start',vrStart:'native VR start',analysisSource:'reviewed file v1',sync:'Verified from native events / clock mapping',actualSeconds:'750',qualityNotes:'phase-specific retention and gaps',syncEvidence:'native start/end mapping'});
 assert.deepEqual(comparisonStatus(s.session,s.checks),[]);
 s.session.vrSeconds='299';assert.ok(comparisonStatus(s.session,s.checks).length);
 s.session.vrSeconds='300';s.session.vrWindow='VR_W03 (10–15 min)';assert.ok(comparisonStatus(s.session,s.checks).some(x=>x.includes('full window')));
});
test('exports keep operator timing, native duration and manual summaries separate',()=>{
 const s=freshVR(date);s.session.actualSeconds='750';s.metrics.rmssd={rest:'50',vr:'40'};
 s.events=[{type:'NOTE',utc:date.toISOString(),elapsed_seconds:12,note:'=HYPERLINK("x")',clock:'browser_wall_clock_unverified'}];
 const r=vrExport(s,date);assert.equal(r.native_duration_plan.tailSeconds,150);assert.equal(r.browser_operator_log.elapsed_seconds,0);
 assert.equal(r.protocol.automatic_stop,false);assert.ok(Math.abs(r.comparison.delta_ln_rmssd-Math.log(.8))<1e-10);
 assert.match(eventsCSV(r),/browser_utc_unverified/);assert.match(eventsCSV(r),/'=HYPERLINK/);
 assert.match(comparisonCSV(r),/"-10","-20"/);assert.equal(csvCell('x,"y"'),'"x,""y"""');
 assert.equal(csvCell(-2),'"-2"');assert.equal(csvCell(' @SUM(1)'), '"\' @SUM(1)"');
});
test('restoration rejects malformed timing and event records',()=>{
 const s=freshVR();s.timer={startedAt:200,endedAt:100};s.events=[null,{}, {type:'NOTE',utc:'not a date',elapsed_seconds:-1,note:''}];
 const r=restoreVR(s);assert.deepEqual(r.timer,{startedAt:null,endedAt:null});assert.deepEqual(r.events,[]);
});
