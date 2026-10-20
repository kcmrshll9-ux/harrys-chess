'use strict';
// Exercise real control handlers with a deterministic, multi-slice AI and clock.
// The search stub isolates timer ownership; chess legality still uses the real engine.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};
function load(){
  let now=0,id=0;const timers=new Map(),handlers=new Map(),els=new Map();
  const ctx=new Proxy({},{get:(_,k)=>/Gradient/.test(k)?()=>({addColorStop:noop}):noop});
  const el=id=>({style:{},dataset:{},clientWidth:640,clientHeight:640,
    classList:{add:noop,remove:noop,contains:()=>false},setAttribute:noop,appendChild:noop,remove:noop,
    getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0}),hasPointerCapture:()=>false,
    addEventListener:(ev,fn)=>handlers.set(id+'/'+ev,fn)});
  const document={addEventListener:noop,getElementById:id=>{if(!els.has(id))els.set(id,el(id));return els.get(id);},querySelectorAll:()=>[],createElement:()=>el('new')};
  const g=new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','performance',source+`
    const applied=[];const originalApply=applyMove;
    applyMove=function(m){applied.push({at:performance.now(),previousAnimationEnd:anim?anim.t0+anim.dur:null,turn:S.turn});return originalApply(m);};
    aiSearchTick=function(b,ep,cast,depth,color){
      const key=posKey(b,ep,cast,color);
      if(!aiSearch||aiSearch.key!==key)aiSearch={key,depth,slices:0};
      if(++aiSearch.slices<3)return {done:false,mv:null};
      aiSearch=null;return {done:true,mv:legalMoves(b,ep,cast,color)[0]||null};
    };
    return {status:window.__game.status,forceMove:window.__game.forceMove,cancelAiTurn,
      get:()=>S,applied,animationEnd:()=>anim?anim.t0+anim.dur:0};
  `)(document,{devicePixelRatio:1,addEventListener:noop},noop,
    (fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},x=>timers.delete(x),{now:()=>now});
  return {...g,click:id=>handlers.get(id+'/click')({}),text:id=>els.get(id).textContent,
    tick(){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)return false;timers.delete(entry[0]);now=entry[1].at;entry[1].fn();return true;},
    until(predicate,limit=1000){for(let i=0;i<limit&&!predicate();i++)assert(this.tick(),'No timer could make progress');assert(predicate(),'Condition did not become true');},
    now:()=>now};
}
const results=[];
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
test('watch progresses for both colors without overwriting an unfinished animation',()=>{
  const g=load();g.click('autoplayBtn');g.until(()=>g.get().pgn.length===6);
  assert.equal(g.status().undoDepth,6);
  for(const m of g.applied)if(m.previousAnimationEnd!==null)assert(m.at>=m.previousAnimationEnd,'Move overlapped a previous slide');
  assert.equal(g.text('autoplayBtn'),'■ Stop watching');
});
test('Undo after a watched Black move returns a playable White turn',()=>{
  const g=load();g.click('autoplayBtn');g.until(()=>g.get().pgn.length===2);g.click('undoBtn');
  const s=g.status();assert.equal(s.turn,'w');assert.equal(s.pgnList.length,0);assert.equal(s.aiPending,false);assert.equal(s.autoplayPending,false);assert.equal(s.autoplayActive,false);
});
test('watch can recover a Black turn without a pre-existing AI timer',()=>{
  const g=load();assert(g.forceMove('e4'));g.cancelAiTurn();g.click('autoplayBtn');g.until(()=>g.get().pgn.length===2);
  assert.equal(g.status().turn,'w');
});
test('stopping during Black reply allows exactly that reply to complete',()=>{
  const g=load();g.click('autoplayBtn');g.until(()=>g.get().pgn.length===1);g.click('autoplayBtn');
  assert.equal(g.status().autoplayActive,false);assert.equal(g.status().autoplayPending,false);
  g.until(()=>g.get().pgn.length===2);assert.equal(g.status().turn,'w');assert.equal(g.status().aiPending,false);assert.equal(g.tick(),false);
});
test('stopping or resetting a partial White search leaves no later automatic move',()=>{
  const g=load();g.click('autoplayBtn');g.click('autoplayBtn');assert.equal(g.get().pgn.length,0);assert.equal(g.tick(),false);
  g.click('autoplayBtn');g.click('newbtn');assert.equal(g.get().pgn.length,0);assert.equal(g.status().autoplayActive,false);assert.equal(g.status().aiPending,false);assert.equal(g.tick(),false);
});
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
