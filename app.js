'use strict';
// Vamos Cangurar! 0.2.0-demo.5 — adaptação do protótipo original de Jefferson Guilherme.
const APP_VERSION='0.2.0-demo.5';
const DEMO_CODE='DEMO-001';
const STORAGE_KEY='vamos-cangurar-demo-0.2';
const RING_LEN=609;
const $=s=>document.querySelector(s);
let sessions=[], running=false, startTime=null, tick=null;
const fmtClock=sec=>String(Math.floor(sec/3600)).padStart(2,'0')+':'+String(Math.floor(sec/60)%60).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
const fmtDur=sec=>sec<60?Math.floor(sec)+'s':Math.floor(sec/60)<60?Math.floor(sec/60)+'min':Math.floor(sec/3600)+'h '+(Math.floor(sec/60)%60)+'min';
const fmtTime=d=>d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const sameDay=(a,b)=>a.toDateString()===b.toDateString();
const avatar=()=> '🤱';
function dayLabel(d){const now=new Date();if(sameDay(d,now))return 'Hoje';const y=new Date(now);y.setDate(y.getDate()-1);return sameDay(d,y)?'Ontem':d.toLocaleDateString('pt-BR');}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),3000);}
function salvarDados(){
 try {
  localStorage.setItem(STORAGE_KEY,JSON.stringify({version:APP_VERSION,mode:'demo',codigo:DEMO_CODE,sessions,
   activeStart:running?startTime.toISOString():null}));
  $('#storageStatus').textContent='';
  return true;
 }catch {
  $('#storageStatus').textContent='Não foi possível salvar neste navegador. A sessão continua nesta tela, mas pode ser perdida ao fechar.';
  return false;
 }
}
function seedDemo(){
 const now=Date.now();
 sessions=[{codigo:DEMO_CODE,caregiver:'Mãe',start:new Date(now-3*3600000),end:new Date(now-3*3600000+24*60000),durSec:1440},
 {codigo:DEMO_CODE,caregiver:'Mãe',start:new Date(now-27*3600000),end:new Date(now-27*3600000+35*60000),durSec:2100}];
}
function carregarDados(){
 try {
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw){seedDemo();salvarDados();return;}
  const data=JSON.parse(raw);
  if(data.mode!=='demo'||data.codigo!==DEMO_CODE||!Array.isArray(data.sessions))throw Error('Formato inválido');
  sessions=data.sessions.map(s=>{
   const start=new Date(s.start),end=new Date(s.end);
   if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start)throw Error('Sessão inválida');
   return {codigo:DEMO_CODE,caregiver:'Mãe',start,end,durSec:Math.floor((end-start)/1000)};
  });
  if(data.activeStart){const d=new Date(data.activeStart);if(!Number.isFinite(d.getTime())||d.getTime()>Date.now())throw Error('Início inválido');startTime=d;running=true;}
 }catch {
  sessions=[];running=false;startTime=null;
  $('#storageStatus').textContent='Não foi possível ler os registros locais. Esta tela começa vazia; os dados anteriores não foram apagados.';
 }
}
function renderTimer(){
 $('#barrierSaveBtn').disabled=running||!barrierStorageReadable;
 $('#barrierRunningNote').textContent=running?'Há uma sessão em andamento. Encerre-a antes de registrar uma dificuldade para fazer agora.':'';
 $('#toggleBtn').textContent=running?'Encerrar simulação':'Iniciar simulação';
 $('#toggleBtn').classList.toggle('stop',running);
 $('#dial').classList.toggle('run',running);
 $('#dialLabel').textContent=running?'Simulação em andamento':'Pronto para simular';
 if(running)update();else{$('#clock').textContent='00:00:00';$('#ring').style.strokeDashoffset=RING_LEN;}
}
function startSession(){
 if(running)return;
 running=true;startTime=new Date();salvarDados();renderTimer();
 tick=setInterval(update,1000);
}
function update(){
 const sec=Math.max(0,Math.floor((Date.now()-startTime.getTime())/1000));
 $('#clock').textContent=fmtClock(sec);
 $('#ring').style.strokeDashoffset=RING_LEN*(1-(sec%3600)/3600);
}
function stopSession(){
 if(!running||!startTime)return;
 clearInterval(tick);tick=null;
 const end=new Date();
 const durSec=Math.max(0,Math.floor((end-startTime)/1000));
 sessions.push({codigo:DEMO_CODE,caregiver:'Mãe',start:startTime,end,durSec});
 running=false;startTime=null;
 const saved=salvarDados();
 renderTimer();renderToday();renderHist();
 toast(saved?'Simulação registrada: '+fmtDur(durSec):'Sessão concluída somente nesta tela.');
}
function renderToday(){
 const t=sessions.filter(s=>sameDay(s.start,new Date()));
 $('#todayCount').textContent=t.length;
 $('#todayTotal').textContent=fmtDur(t.reduce((a,s)=>a+s.durSec,0));
}
function renderHist(){
  const now=new Date();const days=[];let weekSec=0;
  const wd=['D','S','T','Q','Q','S','S'];
  for(let i=6;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i);
    const sec=sessions.filter(s=>sameDay(s.start,d)).reduce((a,s)=>a+s.durSec,0);
    weekSec+=sec;days.push({d,sec});
  }
  $('#weekTotal').textContent=fmtDur(weekSec);
  const maxSec=Math.max(...days.map(d=>d.sec),1);
  $('#weekBars').innerHTML=days.map(o=>`<div class="b" style="height:${Math.max((o.sec/maxSec)*54,5)}px"><span>${wd[o.d.getDay()]}</span></div>`).join('');

  const items=sessions.map(s=>({...s,kind:'s'})).sort((a,b)=>b.start-a.start);
  const groups={};items.forEach(it=>{const key=it.start.toDateString();(groups[key]=groups[key]||[]).push(it);});
  const keys=Object.keys(groups).sort((a,b)=>new Date(b)-new Date(a));

  if(keys.length===0){
    $('#histList').innerHTML='<div class="empty"><span class="em">🦘</span><p>Nenhuma sessão ainda.<br>Inicie seu primeiro contato pele a pele!</p></div>';
    return;
  }
  $('#histList').innerHTML=keys.map(key=>{
    const arr=groups[key];
    const total=arr.filter(i=>i.kind==='s').reduce((a,s)=>a+s.durSec,0);
    const rows=arr.map(it=>{
      if(it.kind==='s')return `<div class="session"><div class="av">${avatar(it.caregiver)}</div><div class="info"><div class="who">${it.caregiver}</div><div class="when">${fmtTime(it.start)} – ${fmtTime(it.end)}</div></div><div class="dur">${fmtDur(it.durSec)}</div></div>`;
      const motivo=it.reasons&&it.reasons.length?it.reasons.join(' · '):'Motivo não informado';
      return `<div class="session skip"><div class="av">🌙</div><div class="info"><div class="who">Não foi possível cangurar</div><div class="when">${fmtTime(it.start)} · ${motivo}</div></div></div>`;
    }).join('');
    return `<div class="day-group"><div class="day-head"><span class="d">${dayLabel(new Date(key))}</span><span class="t">${fmtDur(total)}</span></div>${rows}</div>`;
  }).join('');
}


const BARRIER_STORAGE_KEY='vamos-cangurar-demo-barreiras-v1';
const BARRIER_LIST_VERSION='r03';
const BARRIER_OPTIONS=[{"id": "BAR-01", "label": "Ainda não sei bem como posicionar meu bebê."}, {"id": "BAR-02", "label": "Preciso de orientação ou ajuda da equipe e ainda não consegui."}, {"id": "BAR-03", "label": "Não tenho um lugar confortável ou com privacidade, ou não me sinto à vontade em expor meu corpo."}, {"id": "BAR-05", "label": "Tenho medo de machucar meu bebê ou mexer nos aparelhos e sondas."}, {"id": "BAR-06", "label": "Estou com dor, muito cansada ou não me sinto bem."}, {"id": "BAR-07", "label": "Preciso cuidar de outras tarefas ou dos meus filhos e não tenho ajuda agora."}, {"id": "BAR-08", "label": "Não consigo estar junto do meu bebê agora."}, {"id": "BAR-09", "label": "A equipe orientou aguardar ou meu bebê está recebendo outros cuidados."}, {"id": "BAR-10", "label": "Falta a faixa ou outro material indicado pela equipe."}, {"id": "BAR-11", "label": "Está muito quente e fico desconfortável para fazer o pele a pele."}, {"id": "BAR-12", "label": "Meu bebê parece incomodado ou não aceita ficar na posição agora."}];
let barrierRecords=[], barrierStorageReadable=true;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loadBarrierRecords(){
 try{
  const raw=localStorage.getItem(BARRIER_STORAGE_KEY);
  if(!raw)return;
  const data=JSON.parse(raw);
  if(data.mode!=='demo'||data.codigo!==DEMO_CODE||!Array.isArray(data.records))throw Error('Formato inválido');
  const loaded=data.records.map(record=>{
   if(typeof record.id!=='string'||!/^[a-zA-Z0-9-]+$/.test(record.id)||record.codigo!==DEMO_CODE||record.listVersion!==BARRIER_LIST_VERSION||typeof record.appVersion!=='string'||!/^0\.2\.0-demo\.\d+$/.test(record.appVersion)||!Number.isFinite(new Date(record.at).getTime())||!Array.isArray(record.reasons)||!record.reasons.length)throw Error('Registro inválido');
   const ids=record.reasons.map(reason=>reason.id);
   if(new Set(ids).size!==ids.length||ids.some(id=>!BARRIER_OPTIONS.some(o=>o.id===id)))throw Error('Motivo inválido');
   return {id:record.id,codigo:DEMO_CODE,at:new Date(record.at).toISOString(),appVersion:record.appVersion,listVersion:record.listVersion,reasons:BARRIER_OPTIONS.filter(o=>ids.includes(o.id)).map(o=>({...o}))};
  });
  if(new Set(loaded.map(r=>r.id)).size!==loaded.length)throw Error('Registro repetido');
  barrierRecords=loaded;
 }catch{
  barrierStorageReadable=false;
  $('#barrierStatus').textContent='Não foi possível ler os motivos locais. Os dados anteriores foram preservados; novos registros estão indisponíveis neste navegador.';
 }
}
function renderBarrierChoices(){
 $('#barrierChoices').innerHTML=BARRIER_OPTIONS.map(o=>`<label class="barrier-choice"><input type="checkbox" name="barrier" value="${o.id}"><span>${escapeHTML(o.label)}</span></label>`).join('');
}
function saveBarrierRecord(selected){
 if(running){$('#barrierStatus').textContent='Há uma sessão em andamento. Encerre-a antes de registrar uma dificuldade para fazer agora.';return false;}
 if(!barrierStorageReadable){$('#barrierStatus').textContent='Os motivos anteriores não puderam ser lidos. Eles foram preservados; não é possível registrar novos motivos agora.';return false;}
 if(!Array.isArray(selected)||!selected.length||selected.some(id=>!BARRIER_OPTIONS.some(o=>o.id===id))){$('#barrierStatus').textContent='Marque pelo menos um motivo para registrar, ou feche esta seção para responder depois.';return false;}
 const reasons=BARRIER_OPTIONS.filter(o=>selected.includes(o.id)).map(o=>({...o}));
 const record={id:crypto.randomUUID(),at:new Date().toISOString(),codigo:DEMO_CODE,appVersion:APP_VERSION,listVersion:BARRIER_LIST_VERSION,reasons};
 const next=[...barrierRecords,record];
 try{localStorage.setItem(BARRIER_STORAGE_KEY,JSON.stringify({mode:'demo',codigo:DEMO_CODE,records:next}));}
 catch{$('#barrierStatus').textContent='Não foi possível salvar os motivos neste navegador. Suas escolhas continuam nesta tela para tentar novamente.';return false;}
 barrierRecords=next;renderBarrierHistory();
 document.querySelectorAll('#barrierChoices input').forEach(input=>input.checked=false);
 $('#barrierStatus').textContent='Motivos registrados nesta demonstração. Eles não contam como uma sessão de pele a pele.';
 toast('Motivos registrados na demonstração.');return true;
}
function renderBarrierHistory(){
 $('#barrierExportBtn').disabled=!barrierRecords.length;
 $('#barrierHistory').innerHTML=barrierRecords.length?[...barrierRecords].sort((a,b)=>new Date(b.at)-new Date(a.at)).map(r=>`<article class="barrier-record"><h4>${escapeHTML(dayLabel(new Date(r.at)))} · ${fmtTime(new Date(r.at))}</h4><ul>${r.reasons.map(o=>`<li>${escapeHTML(o.label)}</li>`).join('')}</ul></article>`).join(''):'<p class="demo-note">Nenhum motivo registrado nesta demonstração.</p>';
}
function exportBarrierCSV(){
 if(!barrierRecords.length)return;
 const rows=[['modo','versao_app_registro','codigo','registro_id','data_hora_iso','versao_lista','motivo_codigo','motivo']];
 barrierRecords.forEach(r=>r.reasons.forEach(o=>rows.push(['DEMONSTRACAO',r.appVersion,r.codigo,r.id,r.at,r.listVersion,o.id,o.label])));
 const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download='vamos-cangurar-motivos-demo-'+APP_VERSION+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);toast('CSV de motivos da demonstração exportado.');
}
function resetBarrierRecords(){
 try{localStorage.setItem(BARRIER_STORAGE_KEY,JSON.stringify({mode:'demo',codigo:DEMO_CODE,records:[]}));}
 catch{$('#barrierStatus').textContent='Não foi possível reiniciar os motivos locais. Os registros anteriores foram preservados.';return false;}
 barrierRecords=[];barrierStorageReadable=true;$('#barrierStatus').textContent='';
 document.querySelectorAll('#barrierChoices input').forEach(input=>input.checked=false);
 renderBarrierHistory();return true;
}
$('#barrierForm').addEventListener('submit',event=>{event.preventDefault();saveBarrierRecord(Array.from(document.querySelectorAll('#barrierChoices input:checked'),input=>input.value));});
$('#barrierExportBtn').addEventListener('click',exportBarrierCSV);
$('#goSession').addEventListener('click',()=>document.querySelector('.nav button[data-s="s-timer"]').click());


const edu=[
 {ic:'💜',bg:'linear-gradient(150deg,#E7CFF2,#C99BDB)',tag:'Benefícios',t:'Por que fazer canguru?',image:{"src": "images/GRV-019_r01_contato_pele_a_pele.png", "alt": "Mãe sentada acolhe o bebê em contato pele a pele."},d:'Proximidade, calor e cuidado para o bebê.',
 html:'O contato pele a pele ajuda a manter o bebê aquecido, fortalece o vínculo e favorece a amamentação. No cuidado ao prematuro ou bebê de baixo peso, o Método Canguru contribui para reduzir infecções e melhorar a sobrevivência. O crescimento deve ser acompanhado pela equipe, sem metas iguais para todos.'},
 {ic:'🤱',bg:'linear-gradient(150deg,#EAD9F2,#CBA7E0)',tag:'Posição',t:'Perto do peito, rosto visível',image:{"src": "images/GRV-001_r01_contato_pele_a_pele.png", "alt": "Bebê na vertical junto ao peito da mãe, com o rosto visível e apoiado pelas mãos."},d:'Aprenda a posição com a equipe que cuida do bebê.',
 html:'O bebê fica na vertical, em contato pele a pele junto ao peito, com a cabeça virada para um lado. Mantenha nariz e boca livres, sem o queixo encostado no peito. Peça à equipe que confira a posição e ensine como apoiar e movimentar seu bebê.'},
 {ic:'🧣',bg:'linear-gradient(150deg,#F3D4E6,#DDA0C4)',tag:'Sustentação',t:'A faixa ajuda a apoiar',image:{"src": "images/GRV-022_r01_conhecer_a_faixa.png", "alt": "Profissional orienta a mãe sobre a faixa que sustenta o bebê, deixando o rosto descoberto."},d:'O ajuste precisa ser ensinado e conferido.',
 html:'Use a faixa ou o suporte indicado pela equipe, ajustado ao seu corpo e ao bebê. O tecido deve sustentar sem cobrir o rosto. Aprenda o ajuste com um profissional; uma gravura não substitui essa demonstração.'},
 {ic:'📖',bg:'linear-gradient(150deg,#D9C2EC,#B48BD6)',tag:'Dia a dia',t:'Uma pausa para você também',image:{"src": "images/GRV-026_r01_mae_comendo_fruta.png", "alt": "Mãe sentada come uma banana enquanto mantém o bebê em contato pele a pele."},d:'Leitura, conversa e alimentação com apoio.',
 html:'Com o bebê bem posicionado e apoiado, e conforme a orientação da equipe, você pode aproveitar uma pausa acordada para ler, conversar ou se alimentar. Peça ajuda para deixar uma fruta ou um livro ao alcance. Combine também como descansar e quem pode ajudar quando você estiver cansada.'},
 {ic:'👨‍🍼',bg:'linear-gradient(150deg,#E7CFF2,#C99BDB)',tag:'Cuidar juntos',t:'O pai e a família participam',image:{"src": "images/GRV-025_r01_pele_a_pele_com_pai.png", "alt": "Pai sentado sustenta o bebê em contato pele a pele junto ao peito."},d:'O cuidado pode ser compartilhado.',
 html:'O pai também pode fazer contato pele a pele, com orientação da equipe. A família pode ajudar com a alimentação, a organização da casa e os momentos de descanso. Combine o apoio de que você precisa; fazer canguru não é uma competição.'},
 {ic:'💜',bg:'linear-gradient(150deg,#E7CFF2,#C99BDB)',tag:'A proposta',t:'Contato pele a pele',d:'Um espaço de educação e apoio ao registro.',
 html:'O projeto prevê conteúdos educativos sobre o contato pele a pele no Método Canguru. A linguagem e a apresentação serão aprimoradas com profissionais, mães e especialistas.'},
 {ic:'⏱️',bg:'linear-gradient(150deg,#F3D4E6,#DDA0C4)',tag:'Como usar',t:'Registrar uma sessão',d:'Experimente iniciar, acompanhar e encerrar o cronômetro.',
 html:'Nesta demonstração, toque em Iniciar simulação e depois em Encerrar simulação. Os horários e a duração aparecem no histórico fictício. O cronômetro não define quanto tempo o contato deve durar.'},
 {ic:'🤱',bg:'linear-gradient(150deg,#D9C2EC,#B48BD6)',tag:'Seu ritmo',t:'Acolhimento e motivação',d:'Indicadores para acompanhar, sem cobrança.',
 html:'O protocolo prevê mensagens e indicadores de caráter motivacional e educativo, sem culpa, competição ou pressão. Eles não são prescrição clínica, condição de participação ou avaliação do desempenho materno.'},
 {ic:'🏥',bg:'linear-gradient(150deg,#EAD9F2,#CBA7E0)',tag:'Continuidade',t:'Na maternidade e no seguimento',image:{"src": "images/GRV-024_r01_canguru_no_hospital.png", "alt": "Profissional acompanha a mãe e o bebê durante o canguru no hospital."},d:'Uma proposta que acompanha os contextos do estudo.',
 html:'O estudo contempla as unidades neonatais e, quando aplicável, o seguimento ambulatorial da terceira etapa do Método Canguru. O aplicativo será ajustado às necessidades identificadas nesses contextos.'},
 {ic:'📖',bg:'linear-gradient(150deg,#C99BDB,#7A4BA8)',tag:'Em desenvolvimento',t:'Sobre estas dicas',d:'Fontes e revisão do conteúdo educativo.',
 html:'Estas dicas foram preparadas a partir do folder fornecido ao projeto, com conferência em referências do Ministério da Saúde e da OMS. São conteúdo preliminar, sujeito à revisão do pesquisador e às avaliações do estudo; não substituem a orientação da equipe. As gravuras selecionadas foram incluídas com autorização do pesquisador e fazem parte desta demonstração em avaliação.<br><br>Referências: <a href="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-da-crianca/cuidado-neonatal/metodo-canguru" target="_blank" rel="noopener noreferrer">Método Canguru — Ministério da Saúde</a>; <a href="https://www.who.int/publications/i/item/9789240115910" target="_blank" rel="noopener noreferrer">Guia de prática clínica — OMS, 2025</a>.'}
];
function renderEdu(){
 $('#eduList').innerHTML=edu.map(e=>`<details class="edu-card"><summary><div class="edu-banner${e.image?' has-image':''}" style="background:${e.bg}"><span class="tag">${e.tag}</span>${e.image?`<img src="${e.image.src}" alt="${e.image.alt}" width="1536" height="1024" loading="lazy" decoding="async">`:`<span aria-hidden="true" style="font-size:42px">${e.ic}</span>`}</div><div class="edu-body"><h3>${e.t}</h3><p>${e.d}</p></div></summary><div class="edu-detail">${e.html}</div></details>`).join('');
}
function exportCSV(){
 const rows=[['modo','versao','codigo','inicio_iso','fim_iso','duracao_segundos','duracao_minutos']];
 sessions.forEach(s=>rows.push(['DEMONSTRACAO',APP_VERSION,DEMO_CODE,s.start.toISOString(),s.end.toISOString(),s.durSec,(s.durSec/60).toFixed(2)]));
 const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download='vamos-cangurar-demo-'+APP_VERSION+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);toast('CSV de demonstração exportado.');
}
$('#toggleBtn').addEventListener('click',()=>running?stopSession():startSession());
$('#exportBtn').addEventListener('click',exportCSV);
$('#resetDemo').addEventListener('click',()=>{
 clearInterval(tick);tick=null;running=false;startTime=null;seedDemo();
 const barriersReset=resetBarrierRecords();
 const saved=salvarDados();renderTimer();renderToday();renderHist();
 toast(saved&&barriersReset?'Demonstração reiniciada com exemplos fictícios.':'Não foi possível reiniciar todos os registros locais. Confira os avisos.');
});
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('.nav button').forEach(x=>{x.classList.remove('active');x.removeAttribute('aria-current');});
 document.querySelectorAll('.screen').forEach(x=>x.style.display='none');
 b.classList.add('active');b.setAttribute('aria-current','page');$('#'+b.dataset.s).style.display='block';$('#wrap').scrollTop=0;
}));
carregarDados();loadBarrierRecords();renderBarrierChoices();renderBarrierHistory();renderToday();renderHist();renderEdu();renderTimer();
if(running)tick=setInterval(update,1000);
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js?v='+APP_VERSION).catch(()=>{$('#storageStatus').textContent='O uso offline não foi preparado. Abra esta demonstração com internet.';});
 });
}

