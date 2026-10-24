import { defaults, nextOutput } from './audio-model.js';
let creating;
async function ensureAudio() {
  if ((await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']})).length) return;
  if (!creating) creating = chrome.offscreen.createDocument({url:'offscreen.html', reasons:['USER_MEDIA','AUDIO_PLAYBACK'], justification:'Воспроизведение захваченных вкладок через выбранные устройства с независимой громкостью'}).finally(()=>creating=null);
  await creating;
}
async function audio(action, data={}) {
  await ensureAudio();
  const result = await chrome.runtime.sendMessage({target:'audio', action, ...data});
  if (!result?.ok) throw new Error(result?.error || 'Аудиодвижок не отвечает');
  return result;
}
async function handle(m) {
  const config = {...defaults, ...await chrome.storage.local.get(defaults)};
  if (m.action==='state') return {ok:true, config, sessions:(await audio('state')).sessions};
  if (m.action==='capture') {
    // Must be requested from the extension action by the user's click.
    let streamId;
    try {streamId = await chrome.tabCapture.getMediaStreamId({targetTabId:m.tabId});}
    catch(e){throw new Error('Откройте нужную вкладку, нажмите значок SOUND и повторите захват. Edge может запрещать захват этой страницы. '+e.message);}
    return audio('capture', {tabId:m.tabId, streamId, device:config.devices[config.output], volume:m.volume ?? 100});
  }
  if (m.action==='switch') {
    const output=nextOutput(config.output);
    await audio('sink', {device:config.devices[output]});
    await chrome.storage.local.set({output});
    return {ok:true};
  }
  if (m.action==='save') {
    if (!Array.isArray(m.devices) || m.devices.length!==2 || !m.devices.every(x=>typeof x==='string')) throw new Error('Выберите два устройства');
    await audio('sink', {device:m.devices[config.output]});
    await chrome.storage.local.set({devices:m.devices, names:m.names.map((x,i)=>String(x).trim().slice(0,40)||defaults.names[i])});
    return {ok:true};
  }
  if (['volume','stop'].includes(m.action)) return audio(m.action,{tabId:m.tabId,volume:m.volume});
  throw new Error('Неизвестная команда');
}
let queue=Promise.resolve();
function enqueue(m){const task=queue.then(()=>handle(m));queue=task.catch(()=>{});return task;}
chrome.runtime.onMessage.addListener((m,s,reply)=>{
  if (m.target!=='worker') return;
  enqueue(m).then(reply).catch(e=>reply({ok:false,error:e.message}));
  return true;
});
chrome.commands.onCommand.addListener(command=>{
  if(command==='switch-output') enqueue({action:'switch'}).catch(async e=>{
    await chrome.action.setBadgeText({text:'!'});
    await chrome.action.setTitle({title:`SOUND: ${e.message}`});
  });
});
chrome.tabs.onRemoved.addListener(tabId=>{
  chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']}).then(c=> c.length && audio('stop',{tabId})).catch(()=>{});
});
