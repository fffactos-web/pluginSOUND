import {gainFor} from './audio-model.js';
const sessions=new Map();
function stop(tabId) {
  const s=sessions.get(tabId); if(!s)return;
  sessions.delete(tabId); s.player.pause(); s.player.srcObject=null;
  s.stream.getTracks().forEach(t=>t.stop()); s.source.disconnect(); s.gain.disconnect(); s.context.close();
}
async function handle(m) {
  if(m.action==='state') return {sessions:[...sessions].map(([tabId,s])=>({tabId,volume:s.volume}))};
  if(m.action==='stop'){stop(m.tabId);return {};}
  if(m.action==='capture') {
    if(sessions.has(m.tabId))return {};
    let stream, context, player;
    try {
      stream=await navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:m.streamId}},video:false});
      context=new AudioContext();
      const source=context.createMediaStreamSource(stream), gain=context.createGain(), destination=context.createMediaStreamDestination();
      gain.gain.value=gainFor(m.volume); source.connect(gain).connect(destination);
      player=new Audio(); player.srcObject=destination.stream;
      await player.setSinkId(m.device || ''); await context.resume(); await player.play();
      sessions.set(m.tabId,{stream,context,source,gain,player,volume:m.volume});
      stream.getAudioTracks()[0].addEventListener('ended',()=>stop(m.tabId));
    } catch(e) {player?.pause(); stream?.getTracks().forEach(t=>t.stop()); await context?.close(); throw e;}
    return {};
  }
  if(m.action==='volume') {
    const s=sessions.get(m.tabId); if(!s)throw new Error('Сначала включите управление вкладкой');
    s.gain.gain.setTargetAtTime(gainFor(m.volume),s.context.currentTime,0.02); s.volume=m.volume; return {};
  }
  if(m.action==='sink') {
    const changed=[];
    try {for(const s of sessions.values()){const previous=s.player.sinkId; await s.player.setSinkId(m.device || ''); changed.push([s,previous]);}}
    catch(e){await Promise.allSettled(changed.map(([s,id])=>s.player.setSinkId(id))); throw new Error('Устройство недоступно. Проверьте подключение и доступ в настройках. '+e.message);}
    return {};
  }
  throw new Error('Неизвестная аудиокоманда');
}
chrome.runtime.onMessage.addListener((m,s,reply)=>{
  if(m.target!=='audio')return;
  handle(m).then(r=>reply({ok:true,...r})).catch(e=>reply({ok:false,error:e.message})); return true;
});
