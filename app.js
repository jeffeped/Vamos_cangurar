'use strict';
// Vamos Cangurar! 0.2.0-demo.1 — adaptação do protótipo original de Jefferson Guilherme.
const APP_VERSION='0.2.0-demo.1';
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


const edu=[
 {ic:'💜',bg:'linear-gradient(150deg,#E7CFF2,#C99BDB)',tag:'A proposta',t:'Contato pele a pele',d:'Um espaço de educação e apoio ao registro.',
 html:'O projeto prevê conteúdos educativos sobre o contato pele a pele no Método Canguru. A linguagem e a apresentação serão aprimoradas com profissionais, mães e especialistas.'},
 {ic:'⏱️',bg:'linear-gradient(150deg,#F3D4E6,#DDA0C4)',tag:'Como usar',t:'Registrar uma sessão',d:'Experimente iniciar, acompanhar e encerrar o cronômetro.',
 html:'Nesta demonstração, toque em Iniciar simulação e depois em Encerrar simulação. Os horários e a duração aparecem no histórico fictício. O cronômetro não define quanto tempo o contato deve durar.'},
 {ic:'🤱',bg:'linear-gradient(150deg,#D9C2EC,#B48BD6)',tag:'Seu ritmo',t:'Acolhimento e motivação',d:'Indicadores para acompanhar, sem cobrança.',
 html:'O protocolo prevê mensagens e indicadores de caráter motivacional e educativo, sem culpa, competição ou pressão. Eles não são prescrição clínica, condição de participação ou avaliação do desempenho materno.'},
 {ic:'🏥',bg:'linear-gradient(150deg,#EAD9F2,#CBA7E0)',tag:'Continuidade',t:'Na maternidade e no seguimento',d:'Uma proposta que acompanha os contextos do estudo.',
 html:'O estudo contempla as unidades neonatais e, quando aplicável, o seguimento ambulatorial da terceira etapa do Método Canguru. O aplicativo será ajustado às necessidades identificadas nesses contextos.'},
 {ic:'📖',bg:'linear-gradient(150deg,#C99BDB,#7A4BA8)',tag:'Em desenvolvimento',t:'Orientações, imagens e vídeos',d:'Conteúdo a construir e avaliar com especialistas.',
 html:'As orientações assistenciais, imagens e vídeos ainda serão produzidos e avaliados. Esta tela demonstra a organização do conteúdo e não oferece instruções clínicas ou substitui as orientações da equipe assistencial.'}
];
function renderEdu(){
 $('#eduList').innerHTML=edu.map(e=>`<details class="edu-card"><summary><div class="edu-banner" style="background:${e.bg}"><span class="tag">${e.tag}</span><span aria-hidden="true" style="font-size:42px">${e.ic}</span></div><div class="edu-body"><h3>${e.t}</h3><p>${e.d}</p></div></summary><div class="edu-detail">${e.html}</div></details>`).join('');
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
 const saved=salvarDados();renderTimer();renderToday();renderHist();
 toast(saved?'Demonstração reiniciada com exemplos fictícios.':'Exemplos reiniciados somente nesta tela.');
});
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('.nav button').forEach(x=>{x.classList.remove('active');x.removeAttribute('aria-current');});
 document.querySelectorAll('.screen').forEach(x=>x.style.display='none');
 b.classList.add('active');b.setAttribute('aria-current','page');$('#'+b.dataset.s).style.display='block';$('#wrap').scrollTop=0;
}));
carregarDados();renderToday();renderHist();renderEdu();renderTimer();
if(running)tick=setInterval(update,1000);
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js').catch(()=>{$('#storageStatus').textContent='O uso offline não foi preparado. Abra esta demonstração com internet.';});
 });
}

