import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('HTML solicita o código da mesma versão e essa URL está no cache offline',()=>{
 const version=JSON.parse(readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;
 const script=html.match(/<script src="([^"]+)"/)[1];
 assert.equal(new URL(script,'https://example.test/').searchParams.get('v'),version);
 const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.ok(worker.includes("'./"+script+"'"),'O cache precisa conter a URL exata solicitada pelo HTML');
 assert.equal(html.match(/name="app-version" content="([^"]+)"/)[1],version);
});
let code; try {code=readFileSync(new URL('../app.js',import.meta.url),'utf8');} catch {code=html.match(/<script>([\s\S]*?)<\/script>/)[1];}
function boot(storage=new Map(),time=Date.now()){
 const nodes=new Map(), requests=[], blobs=[];
 let now=time;
 class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',value:'',checked:false,style:{},handlers:{},classList:{add(){},remove(){},toggle(){}},addEventListener(e,fn){this.handlers[e]=fn;},setAttribute(){},removeAttribute(){},click(){this.handlers.click?.();}});return nodes.get(id);}
 const context={Date:Clock,console,JSON,Math,Blob,Set,Map,Number,String,crypto:{randomUUID:()=> 'demo-session-1'},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},fetch:(...args)=>{requests.push(args);return Promise.resolve({});},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},navigator:{},document:{querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),createElement:()=>node('download')},URL:{createObjectURL:b=>{blobs.push(b);return 'blob:test';},revokeObjectURL(){}},addEventListener(){}};
 context.window=context;vm.createContext(context);vm.runInContext(code,context);
 return {run:s=>vm.runInContext(s,context),advance:ms=>now+=ms,storage,requests,blobs,node};
}
test('Demonstração identificada na interface e sem identificadores diretos',()=>{
 assert.match(html,/0\.2\.0-demo\.5/);assert.match(html,/dados fictícios/i);
 assert.doesNotMatch(html,/<input[^>]+id="(?:bebeDNV|bebeNasc|maeIdade|reasonOther)"/);
 assert.doesNotMatch(html,/Concordo voluntariamente em participar desta pesquisa/);
});
test('Ações não transmitem dados nem reutilizam cadastro antigo',()=>{
 const s=new Map([['vc_cadastro',JSON.stringify({bebeDNV:'IDENTIFICADOR-ANTIGO'})]]);
 const a=boot(s);a.run('startSession()');a.advance(125000);a.run('stopSession()');
 assert.equal(a.requests.length,0);assert.doesNotMatch(code,/script\.google\.com|SHEET_URL|enviarParaSheet/);
 assert.doesNotMatch(JSON.stringify([...s.entries()].filter(([k])=>k!=='vc_cadastro')),/IDENTIFICADOR-ANTIGO/);
 assert.equal(s.get('vc_cadastro'),JSON.stringify({bebeDNV:'IDENTIFICADOR-ANTIGO'}));
});
test('Cronômetro preserva uma sessão em andamento após recarregar',()=>{
 const a=boot();a.run('startSession()');a.advance(125000);
 const b=boot(a.storage,Date.now()+125000); b.run('stopSession()');
 const last=b.run('sessions.at(-1)');assert.ok(last.durSec>=125&&last.durSec<128);
 assert.equal(b.run('running'),false);assert.equal(last.codigo,'DEMO-001');
});
test('CSV identifica explicitamente versão, demonstração e horários completos',async()=>{
 const a=boot();a.run('startSession()');a.advance(125000);a.run('stopSession()');a.run('exportCSV()');
 const csv=await a.blobs.at(-1).text();
 assert.match(csv,/0\.2\.0-demo\.5/);assert.match(csv,/DEMONSTRACAO/);assert.match(csv,/DEMO-001/);
 assert.match(csv,/inicio_iso/);assert.match(csv,/fim_iso/);assert.doesNotMatch(csv,/DNV|renda|trabalho|TCLE aceito/);
});
test('Armazenamento indisponível é comunicado sem bloquear o cronômetro',()=>{
 const a=boot();a.run("localStorage.setItem=()=>{throw Error('quota')}; startSession()");
 assert.equal(a.run('running'),true);assert.match(a.node('#storageStatus').textContent,/não foi possível salvar/i);
});


test('Motivos aceitam seleção múltipla sem alterar sessões ou duração',()=>{
 const a=boot();const before=a.run('JSON.stringify(sessions)');const stored=a.storage.get(a.run('STORAGE_KEY'));
 assert.equal(a.run("saveBarrierRecord(['BAR-11','BAR-12','BAR-11'])"),true);
 assert.equal(a.run('barrierRecords.length'),1);assert.equal(a.run('barrierRecords[0].reasons.length'),2);
 assert.equal(a.run('JSON.stringify(sessions)'),before);assert.equal(a.storage.get(a.run('STORAGE_KEY')),stored);
 assert.equal(a.requests.length,0);
});
test('Motivos reaparecem após recarregar com código e versões do registro',()=>{
 const a=boot();a.run("saveBarrierRecord(['BAR-11','BAR-12'])");
 const b=boot(a.storage);assert.equal(b.run('barrierRecords.length'),1);
 assert.equal(b.run('barrierRecords[0].codigo'),'DEMO-001');assert.equal(b.run('barrierRecords[0].listVersion'),'r03');
 assert.equal(b.run('barrierRecords[0].appVersion'),b.run('APP_VERSION'));
 assert.match(b.run('barrierRecords[0].at'),/^\d{4}-\d{2}-\d{2}T/);
 assert.match(b.node('#barrierHistory').innerHTML,/muito quente/);
});
test('Resposta vazia ou motivo desconhecido não cria registro',()=>{
 const a=boot();assert.equal(a.run('saveBarrierRecord([])'),false);
 assert.equal(a.run("saveBarrierRecord(['DESCONHECIDO'])"),false);
 assert.equal(a.run('barrierRecords.length'),0);
});
test('Motivo não pode ser registrado com sessão em andamento',()=>{
 const a=boot();a.run('startSession()');assert.equal(a.run("saveBarrierRecord(['BAR-11'])"),false);
 assert.equal(a.run('barrierRecords.length'),0);assert.equal(a.run('running'),true);
});
test('Falha de armazenamento não anuncia nem mantém motivo como salvo',()=>{
 const a=boot();a.run("localStorage.setItem=()=>{throw Error('quota')}");
 assert.equal(a.run("saveBarrierRecord(['BAR-11'])"),false);assert.equal(a.run('barrierRecords.length'),0);
 assert.match(a.node('#barrierStatus').textContent,/não foi possível salvar/i);
});
test('CSV de motivos tem uma linha por seleção e é separado do CSV de sessões',async()=>{
 const a=boot();a.run("saveBarrierRecord(['BAR-11','BAR-12'])");a.run('exportBarrierCSV()');
 const csv=await a.blobs.at(-1).text();assert.equal(csv.split('\r\n').length,3);
 assert.match(csv,/motivo_codigo/);assert.match(csv,/BAR-11/);assert.match(csv,/BAR-12/);assert.match(csv,/DEMONSTRACAO/);assert.match(csv,/r03/);
 assert.doesNotMatch(csv,/duracao_segundos|nome_mae|DNV/);
 a.run('exportCSV()');const sessions=await a.blobs.at(-1).text();assert.match(sessions,/duracao_segundos/);assert.doesNotMatch(sessions,/BAR-11/);
});
test('Arquivo de motivos ilegível é preservado e não bloqueia sessões',()=>{
 const a=boot();const key=a.run('BARRIER_STORAGE_KEY');a.storage.set(key,'ARQUIVO-ILEGIVEL');
 const b=boot(a.storage);assert.equal(b.run("saveBarrierRecord(['BAR-11'])"),false);assert.equal(b.storage.get(key),'ARQUIVO-ILEGIVEL');
 b.run('startSession()');assert.equal(b.run('running'),true);
});
test('Reiniciar demonstração limpa motivos e preserva a separação do cadastro antigo',()=>{
 const a=boot();a.run("saveBarrierRecord(['BAR-11'])");a.storage.set('vc_cadastro','CADASTRO-ANTIGO');a.node('#resetDemo').click();
 assert.equal(a.run('barrierRecords.length'),0);assert.equal(a.storage.get('vc_cadastro'),'CADASTRO-ANTIGO');
 const b=boot(a.storage);assert.equal(b.run('barrierRecords.length'),0);
});
