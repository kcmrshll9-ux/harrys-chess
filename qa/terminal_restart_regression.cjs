'use strict';
// Terminal-restart difficulty retention: the game-over overlay's Play Again and
// difficulty buttons, and the footer New Game button, must each set difficulty
// correctly. Guards the 2026-11-02 regression where Play Again silently reset
// Expert to Medium (newGame() instead of newGame(difficulty)).
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};
function load(){
  let now=0,id=0,cid=0;const timers=new Map(),handlers=new Map(),els=new Map(),created=[];
  const ctx=new Proxy({},{get:(_,k)=>/Gradient/.test(k)?()=>({addColorStop:noop}):noop});
  function el(id){const e={style:{},dataset:{},clientWidth:640,clientHeight:640,
    classList:{add:noop,remove:noop,contains:()=>false},setAttribute:noop,remove:noop,
    _children:[],appendChild:(c)=>{e._children.push(c);},
    querySelectorAll:(sel)=>e._children.filter(c=>c.tag===sel),
    getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0}),hasPointerCapture:()=>false,
    addEventListener:(ev,fn)=>{if(ev==='click')e._click=fn;else handlers.set(id+'/'+ev,fn);}};
    if(id==='new')e._created=true,created.push(e);return e;}
  const document={addEventListener:noop,getElementById:id=>{if(!els.has(id))els.set(id,el(id));return els.get(id);},querySelectorAll:()=>[],createElement:(tag)=>{const e=el('new');e.tag=tag;return e;}};
  const g=new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','performance',source+`
    return {status:window.__game.status,forceMove:window.__game.forceMove,newGame:window.__game.newGame,
      setDifficulty:window.__game.setDifficulty,
      vars:()=>({difficulty,aiDepth}),get:()=>S};
  `)(document,{devicePixelRatio:1,addEventListener:noop},noop,
    (fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},x=>timers.delete(x),{now:()=>now});
  return {...g,created,click:id=>{const h=handlers.get(id+'/click')||(els.get(id)&&els.get(id)._click);assert(h,'no click handler for '+id);h({});},
    clickEl:e=>{assert(e._click,'element has no click handler');e._click({});},
    installMate(){ // defended black mate-in-one: Qa2→c2 vs lone white Kc1 (Kc1 cannot capture the defended queen; king b3 defends c2).
      const s=g.get();
      s.b=Array(64).fill(null);
      const rows=['7k','8','8','8','8','1k5','q7','2K5']; // rank8..rank1
      for(let i=0;i<8;i++){const r=7-i;let f=0;for(const ch of rows[i]){if(/[1-8]/.test(ch))f+=+ch;else s.b[r*8+f++]=ch;}}
      s.ep=null;s.cast={K:{w:false,b:false},Q:{w:false,b:false}};s.turn='b';s.half=0;s.lastMove=null;s.pgn=[];s.over=null;
      assert(g.forceMove('Qc2#'),'mate-in-one fixture move must be accepted');
      assert.equal(s.over&&s.over.result,'lose','terminal should be a human (white) loss');
    }};
}
const results=[];
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
test('overlay Play Again keeps the difficulty the game was played at',()=>{
  const g=load();g.newGame(2);
  assert.equal(g.vars().difficulty,2);assert.equal(g.vars().aiDepth,5);
  g.installMate();
  const pa=g.created.find(e=>e._created&&e.textContent==='Play Again');
  assert(pa,'Play Again button must be created by the result overlay');
  g.clickEl(pa);
  assert.equal(g.vars().difficulty,2,'Play Again must preserve difficulty');
  assert.equal(g.vars().aiDepth,5,'Play Again must preserve effective search depth');
  assert.equal(g.get().pgn.length,0,'Play Again must reset the game');
  assert.equal(g.get().turn,'w');assert.equal(g.get().over,null);
});
test('overlay difficulty buttons override explicitly',()=>{
  const g=load();g.newGame(2);g.installMate();
  const easy=g.created.filter(e=>e._created&&e.dataset.diff==='0').pop();
  assert(easy,'overlay must create an Easy difficulty button');
  g.clickEl(easy);
  assert.equal(g.vars().difficulty,0);assert.equal(g.vars().aiDepth,2);
  assert.equal(g.get().pgn.length,0);
});
test('footer New Game preserves difficulty (entry points must agree)',()=>{
  const g=load();g.newGame(2);g.installMate();
  g.click('newbtn');
  assert.equal(g.vars().difficulty,2,'New Game must preserve difficulty');
  assert.equal(g.vars().aiDepth,5);
  assert.equal(g.get().pgn.length,0);
});
test('mid-game difficulty change survives terminal restart',()=>{
  const g=load();g.setDifficulty(0);g.installMate();
  const pa=g.created.find(e=>e._created&&e.textContent==='Play Again');
  g.clickEl(pa);
  assert.equal(g.vars().difficulty,0);assert.equal(g.vars().aiDepth,2);
});
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
