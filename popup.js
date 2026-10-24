const $=id=>document.getElementById(id);
async function request(action,data={}){const r=await chrome.runtime.sendMessage({target:'worker',action,...data});if(!r?.ok)throw new Error(r?.error||'Нет связи с расширением');return r;}
function report(e){$('notice').textContent=e.message;}
async function load(){
  const {config,sessions}=await request('state');
  $('device-name').textContent=config.names[config.output];
  $('switch-label').textContent=`На ${config.names[1-config.output]}`;
  if(!config.devices[0]&&!config.devices[1])$('notice').textContent='Выберите два устройства в настройках. Пока используется системный выход.';
  const tabs=await chrome.tabs.query({});
  const visible=tabs.filter(t=>t.audible||sessions.some(s=>s.tabId===t.id)||t.active&&!/^(edge|chrome|about|chrome-extension):/.test(t.url||''));
  $('count').textContent=`${sessions.length} под управлением`;
  $('tabs').replaceChildren();
  if(!visible.length){const p=document.createElement('p');p.className='empty';p.textContent='Откройте вкладку с музыкой или видео — она появится здесь.';$('tabs').append(p);}
  for(const t of visible){
    const session=sessions.find(s=>s.tabId===t.id);
    const row=document.createElement('div');row.className='tab';
    row.innerHTML='<div class="tab-top"><span class="favicon">♫</span><span class="tab-title"></span><button class="small"></button></div>';
    row.querySelector('.tab-title').textContent=t.title||'Вкладка';
    const button=row.querySelector('button');button.textContent=session?'Отключить':'Управлять';
    button.addEventListener('click',async()=>{button.disabled=true;try{await request(session?'stop':'capture',{tabId:t.id});$('notice').textContent='';await load();}catch(e){report(e);}finally{button.disabled=false;}});
    if(session){
      const v=document.createElement('div');v.className='volume';
      v.innerHTML='<input type="range" min="0" max="100" step="1"><output></output>';
      const input=v.querySelector('input'),out=v.querySelector('output');input.value=session.volume;input.setAttribute('aria-label',`Громкость: ${t.title||'вкладка'}`);out.textContent=`${session.volume}%`;
      let pending=Promise.resolve();input.addEventListener('input',()=>{const volume=Number(input.value);out.textContent=`${volume}%`;pending=pending.then(()=>request('volume',{tabId:t.id,volume})).catch(report);});row.append(v);
    }
    $('tabs').append(row);
  }
}
$('settings').onclick=()=>chrome.runtime.openOptionsPage();
$('switch').onclick=async()=>{$('switch').disabled=true;try{await request('switch');$('notice').textContent='';await load();}catch(e){report(e);}finally{$('switch').disabled=false;}};
load().catch(report);
