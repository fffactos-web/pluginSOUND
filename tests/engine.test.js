import test from 'node:test';
import assert from 'node:assert/strict';
let listener, closed=0, stopped=0;
const players=[];
globalThis.chrome={runtime:{onMessage:{addListener(fn){listener=fn;}}}};
Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{async getUserMedia(){return {getTracks:()=>[{stop(){stopped++;}}],getAudioTracks:()=>[{addEventListener(){}}]};}}},configurable:true});
globalThis.AudioContext=class {
  currentTime=0;
  createMediaStreamSource(){return {connect(n){return n;},disconnect(){}};}
  createGain(){return {gain:{value:1,setTargetAtTime(v){this.value=v;}},connect(){},disconnect(){}};}
  createMediaStreamDestination(){return {stream:{}};}
  async resume(){} async close(){closed++;}
};
globalThis.Audio=class {
  sinkId='';
  constructor(){players.push(this);}
  async setSinkId(id){if(id==='missing')throw new Error('NotFoundError');this.sinkId=id;}
  async play(){} pause(){}
};
await import('../offscreen.js');
const send=(action,data={})=>new Promise(resolve=>listener({target:'audio',action,...data},{},resolve));
test('capture, independent volume, device switch, failure rollback and release',async()=>{
  assert.equal((await send('capture',{tabId:1,streamId:'first',volume:100,device:'headphones'})).ok,true);
  assert.equal((await send('capture',{tabId:2,streamId:'second',volume:80,device:'headphones'})).ok,true);
  await send('volume',{tabId:1,volume:25});
  assert.deepEqual((await send('state')).sessions,[{tabId:1,volume:25},{tabId:2,volume:80}]);
  assert.equal((await send('sink',{device:'speakers'})).ok,true);
  assert.deepEqual(players.map(p=>p.sinkId),['speakers','speakers']);
  assert.equal((await send('sink',{device:'missing'})).ok,false);
  assert.deepEqual(players.map(p=>p.sinkId),['speakers','speakers']);
  await send('stop',{tabId:1});await send('stop',{tabId:2});
  assert.deepEqual((await send('state')).sessions,[]);
  assert.equal(closed,2);assert.equal(stopped,2);
});
