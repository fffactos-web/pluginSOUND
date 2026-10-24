import test from 'node:test';
import assert from 'node:assert/strict';
let listener, sessions=[],calls=[],failSink=false,failCapture=false;
const config={devices:['headphones','speakers'],names:['Наушники','Динамики'],output:0};
globalThis.chrome={
 runtime:{getContexts:async()=>[{}],onMessage:{addListener(fn){listener=fn;}},sendMessage:async m=>{
  calls.push(m);
  if(m.action==='state')return {ok:true,sessions:[...sessions]};
  if(m.action==='capture'){sessions.push({tabId:m.tabId,volume:m.volume});return {ok:true};}
  if(m.action==='sink'&&failSink)return {ok:false,error:'Device unavailable'};
  if(m.action==='stop')sessions=sessions.filter(s=>s.tabId!==m.tabId);
  return {ok:true};
 }},
 storage:{local:{get:async()=>({...config}),set:async x=>Object.assign(config,x)}},
 tabs:{query:async()=>[{id:7,url:'https://www.youtube.com/watch?v=test'}],onRemoved:{addListener(){}}},
 tabCapture:{getMediaStreamId:async()=>{if(failCapture)throw new Error('Denied');return 'user-authorized-stream';}},
 commands:{onCommand:{addListener(){}}},action:{setBadgeText:async()=>{},setTitle:async()=>{}}
};
await import('../background.js');
const send=(output)=>new Promise(resolve=>listener({target:'worker',action:'select-output',output},{},resolve));
test('output click captures active tab before routing, repeats safely, and reports failures',async()=>{
 assert.equal((await send(1)).ok,true);
 assert.equal(config.output,1);
 assert.equal(sessions[0].tabId,7);
 assert.equal(calls.find(c=>c.action==='capture').device,'speakers');
 calls=[];
 assert.equal((await send(0)).ok,true);
 assert.equal(calls.some(c=>c.action==='capture'),false);
 assert.equal(calls.find(c=>c.action==='sink').device,'headphones');
 failSink=true;
 assert.equal((await send(1)).ok,false);
 assert.equal(config.output,0);
 sessions=[];
 assert.equal((await send(1)).ok,false);
 assert.equal(sessions.length,0,'a failed first route releases the capture');
 failSink=false;failCapture=true;
 assert.equal((await send(1)).ok,false);
 assert.equal(config.output,0);
 failCapture=false;config.devices=['',''];calls=[];
 assert.equal((await send(1)).ok,false);
 assert.equal(calls.length,0,'an unconfigured pair cannot silently succeed');
});
