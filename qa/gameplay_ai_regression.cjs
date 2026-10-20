'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};
function load(clock){
  const ctx=new Proxy({},{get:(_,k)=>/Gradient/.test(k)?()=>({addColorStop:noop}):noop,set:()=>true});
  const el=()=>({style:{},dataset:{},classList:{add:noop,remove:noop,contains:()=>false},clientWidth:640,clientHeight:640,getContext:()=>ctx,addEventListener:noop,appendChild:noop,remove:noop,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0}),hasPointerCapture:()=>false});
  const els=new Map(),document={addEventListener:noop,getElementById:id=>{if(!els.has(id))els.set(id,el());return els.get(id);},querySelectorAll:()=>[],createElement:el};
  const math=Object.create(Math);math.random=()=>0.5;
  return new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','performance','Math',source+`
    return {get:()=>S,set:s=>{S=s;aiSearch=null;},legalMoves,makeState,posKey,evaluate,search,aiSearchTick,searchState:()=>aiSearch};
  `)(document,{devicePixelRatio:1,addEventListener:noop},noop,()=>0,noop,clock,math);
}
const sq=i=>'abcdefgh'[i&7]+(1+(i>>3)),uci=m=>m?sq(m.from)+sq(m.to)+(m.promo||''):null;
function fen(f){const p=f.split(' '),b=Array(64).fill(null);p[0].split('/').forEach((row,j)=>{let x=0;for(const ch of row){if(/[1-8]/.test(ch))x+=+ch;else b[(7-j)*8+x++]=ch;}});return {b,ep:null,cast:{K:{w:p[2].includes('K'),b:p[2].includes('k')},Q:{w:p[2].includes('Q'),b:p[2].includes('q')}},turn:p[1],half:+p[4],posHist:[],pgn:[]};}
const reports=[];
function test(name,fn){try{reports.push({name,...fn(),status:'PASS'});}catch(e){reports.push({name,status:'FAIL',error:e.stack});}}
test('second occurrence stays live; third occurrence is a draw in the search',()=>{
  const g=load(performance),s=fen('7k/8/8/8/8/8/8/KQ6 w - - 0 1'),key=g.posKey(s.b,s.ep,s.cast,'w');
  const once=g.search(s.b,s.ep,s.cast,0,-Infinity,Infinity,'w',0,new Map([[key,1]])).score;
  const twice=g.search(s.b,s.ep,s.cast,0,-Infinity,Infinity,'w',0,new Map([[key,2]])).score;
  const thrice=g.search(s.b,s.ep,s.cast,0,-Infinity,Infinity,'w',0,new Map([[key,3]])).score;
  assert(once>0);assert.equal(twice,once,'the second occurrence was incorrectly scored as a draw');assert.equal(thrice,0);
  return {once,twice,thrice};
});
test('UI expert search completes useful depth despite callback gaps',()=>{
  let idle=0;const g=load({now:()=>performance.now()+idle}),s=g.get();
  const first=g.legalMoves(s.b,s.ep,s.cast,'w').find(m=>uci(m)==='e2e4');
  const n=g.makeState(s.b,s.ep,s.cast,first),next={...s,...n,turn:'b',half:0};next.posHist=[...s.posHist,g.posKey(next.b,next.ep,next.cast,'b')];g.set(next);
  let result,completedDepth=0,slices=0,maxSliceMs=0;const started=performance.now();
  do{const at=performance.now();result=g.aiSearchTick(next.b,next.ep,next.cast,5,'b');maxSliceMs=Math.max(maxSliceMs,performance.now()-at);slices++;
    const state=g.searchState();if(state&&state.best)completedDepth=Math.max(completedDepth,state.completedDepth||state.d-1);
    completedDepth=Math.max(completedDepth,result.depth||0);idle+=20;
  }while(!result.done&&slices<1000);
  assert(result.done);assert(g.legalMoves(next.b,next.ep,next.cast,'b').some(m=>uci(m)===uci(result.mv)));
  const evidence={completedDepth,slices,maxSliceMs,elapsedWithCallbackGaps:performance.now()-started+idle,move:uci(result.mv)};
  assert(completedDepth>=3,'Expert completed only '+completedDepth+' ply: '+JSON.stringify(evidence));
  assert(maxSliceMs<120,'one slice blocked controls for '+maxSliceMs+'ms');
  assert(evidence.elapsedWithCallbackGaps<1800,'AI turn exceeded its budget');return evidence;
});
test('fifty-move and dead-position scores match game adjudication',()=>{
  const g=load(performance),s=fen('7k/8/8/8/8/8/8/KQ6 w - - 100 1');
  const live=g.search(s.b,s.ep,s.cast,0,-Infinity,Infinity,'w',0,null,99).score;
  const fifty=g.search(s.b,s.ep,s.cast,0,-Infinity,Infinity,'w',0,null,100).score;
  const dead=fen('7k/8/8/8/8/8/8/KB6 w - - 0 1');
  const insufficient=g.search(dead.b,dead.ep,dead.cast,2,-Infinity,Infinity,'w',0).score;
  const mate=fen('7k/6Q1/5K2/8/8/8/8/8 b - - 100 1');
  const matingScore=g.search(mate.b,mate.ep,mate.cast,0,-Infinity,Infinity,'b',1,null,100).score;
  assert(live>0);assert.equal(fifty,0);assert.equal(insufficient,0);assert(matingScore>500000);
  return {live,fifty,insufficient,matingScore};
});
const tactical=JSON.parse(fs.readFileSync(path.join(__dirname,'gameplay_fixtures.json'),'utf8'));
for(const fixture of tactical.fixtures)test('actual UI search: '+fixture.name,()=>{
  let idle=0;const g=load({now:()=>performance.now()+idle}),s=fen(fixture.fen);
  s.posHist=[g.posKey(s.b,s.ep,s.cast,s.turn)];g.set(s);
  let result,slices=0;do{result=g.aiSearchTick(s.b,s.ep,s.cast,fixture.depth,s.turn);idle+=20;slices++;}while(!result.done&&slices<1000);
  assert(result.done);const selected=uci(result.mv);assert(Object.hasOwn(fixture.moves,selected));
  if(fixture.expect==='mate')assert(fixture.mate_moves.includes(selected));
  else if(fixture.expect==='capture_free_piece')assert(fixture.target_captures.includes(selected.slice(0,4)));
  else if(fixture.expect==='avoid_mate')assert(!fixture.losing_moves.includes(selected));
  return {selected,completedDepth:result.depth,slices};
});
console.log(JSON.stringify(reports,null,2));
if(reports.some(r=>r.status==='FAIL'))process.exitCode=1;
