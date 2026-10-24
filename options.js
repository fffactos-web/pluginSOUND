import {defaults} from './audio-model.js';
const $=id=>document.getElementById(id);let config;
async function devices(){
  const outputs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput');
  for(let i=0;i<2;i++){
    const select=$(`device${i}`),previous=select.value||config.devices[i];select.replaceChildren(new Option('Системное устройство по умолчанию',''));
    for(const d of outputs)if(d.deviceId&&d.deviceId!=='default')select.add(new Option(d.label||`Аудиовыход ${select.length}`,d.deviceId));
    if(previous&&![...select.options].some(o=>o.value===previous))select.add(new Option('Сохранённое устройство (не обнаружено)',previous));
    select.value=previous;
  }
}
$('discover').onclick=async()=>{
  $('discover').disabled=true;
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop());await devices();$('notice').textContent='Список обновлён. Выберите устройства и сохраните пару.';}
  catch(e){$('notice').textContent='Не удалось получить доступ: '+e.message;}finally{$('discover').disabled=false;}
};
$('save').onclick=async()=>{
  $('save').disabled=true;
  try{const devices=[0,1].map(i=>$(`device${i}`).value),names=[0,1].map(i=>$(`name${i}`).value);
    if(devices[0]===devices[1])throw new Error('Для переключения выберите два разных выхода.');
    const r=await chrome.runtime.sendMessage({target:'worker',action:'save',devices,names});if(!r?.ok)throw new Error(r?.error||'Ошибка сохранения');config={...config,devices,names};$('notice').textContent='Пара сохранена. Можно переключать звук.';
  }catch(e){$('notice').textContent=e.message;}finally{$('save').disabled=false;}
};
(async()=>{config=await chrome.storage.local.get(defaults);for(let i=0;i<2;i++)$(`name${i}`).value=config.names[i];await devices();navigator.mediaDevices.addEventListener('devicechange',()=>devices().catch(e=>$('notice').textContent=e.message));})().catch(e=>$('notice').textContent=e.message);
