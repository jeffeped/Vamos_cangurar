import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
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
 assert.match(html,/0\.2\.0-demo\.3/);assert.match(html,/dados fictícios/i);
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
 assert.match(csv,/0\.2\.0-demo\.3/);assert.match(csv,/DEMONSTRACAO/);assert.match(csv,/DEMO-001/);
 assert.match(csv,/inicio_iso/);assert.match(csv,/fim_iso/);assert.doesNotMatch(csv,/DNV|renda|trabalho|TCLE aceito/);
});
test('Armazenamento indisponível é comunicado sem bloquear o cronômetro',()=>{
 const a=boot();a.run("localStorage.setItem=()=>{throw Error('quota')}; startSession()");
 assert.equal(a.run('running'),true);assert.match(a.node('#storageStatus').textContent,/não foi possível salvar/i);
});

