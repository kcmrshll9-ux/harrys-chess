'use strict';
// Assert what the renderer draws, not just that it does not throw.
const fs=require('fs'), path=require('path'), assert=require('assert');
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{}; let clock=0, patternCount=0, clearCount=0;const frames=[];
const ctx=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop:noop}):key==='createPattern'?()=>({pattern:++patternCount}):key==='clearRect'?()=>{clearCount++;}:noop,set:()=>true});
const elements={};
function element(id){return {id,style:{},dataset:{},classList:{add:noop,remove:noop,contains:()=>false},setAttribute:noop,addEventListener:noop,appendChild:noop,remove:noop,querySelectorAll:()=>[],getContext:()=>ctx,clientWidth:640,clientHeight:640,width:640,height:640,getBoundingClientRect:()=>({left:0,top:0,width:640,height:640}),hasPointerCapture:()=>false,releasePointerCapture:noop,setPointerCapture:noop};}
const document={getElementById:id=>elements[id]||(elements[id]=element(id)),createElement:tag=>element(tag),addEventListener:noop,querySelectorAll:()=>[]};
const window={devicePixelRatio:1,addEventListener:noop};
const G=new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','performance',source+`
const drawn=[];
drawPiece=(piece,x,y,size)=>drawn.push({piece,x,y,size});
return {
 install(fen){
   resetGame(); const parts=fen.split(' '), b=Array(64).fill(null);
   parts[0].split('/').forEach((row,r)=>{let f=0;for(const ch of row){if(/[1-8]/.test(ch))f+=Number(ch);else b[(7-r)*8+f++]=ch;}});
   const rights=parts[2];S={b,turn:parts[1],ep:null,cast:{K:{w:rights.includes('K'),b:rights.includes('k')},Q:{w:rights.includes('Q'),b:rights.includes('q')}},half:0,lastMove:null,pgn:[],over:null,posHist:[]};
 },
 move(from,to){const n=s=>FILES.indexOf(s[0])+8*(Number(s[1])-1);const m=legalMoves(S.b,S.ep,S.cast,S.turn).find(m=>m.from===n(from)&&m.to===n(to));if(!m)throw Error('Illegal fixture move '+from+to);applyMove(m);},
 animation:()=>JSON.parse(JSON.stringify(anim)),
 draw(){drawn.length=0;drawBoard();return drawn.slice();},
 position:()=>S.b.slice(),newGame:()=>newGame(),markDirty:()=>md(),square:s=>sqXY(FILES.indexOf(s[0])+8*(Number(s[1])-1))
};`)(document,window,fn=>frames.push(fn),()=>1,noop,{now:()=>clock});
const failures=[],passed=[];
function test(name,fn){try{fn();passed.push(name);}catch(error){failures.push({name,error:error.message});}}

for(const color of ['w','b'])for(const side of ['king','queen']){
 test(color+' '+side+' side castle animation lands on the actual king and rook squares',()=>{
   clock=0;G.install('r3k2r/8/8/8/8/8/8/R3K2R '+color+' KQkq - 0 1');
   const rank=color==='w'?'1':'8', offset=color==='w'?0:56;
   G.move('e'+rank,(side==='king'?'g':'c')+rank);
   const a=G.animation();const rook=a.moves.find(m=>m.piece.toLowerCase()==='r');
   assert.strictEqual(rook.to,offset+(side==='king'?5:3));
   assert.strictEqual(new Set(a.moves.map(m=>m.to)).size,2);
   clock=a.t0+rook.delay/2;const early=G.draw(),[rx,ry]=G.square((side==='king'?'h':'a')+rank);
   assert(early.some(d=>d.piece===rook.piece&&d.x===rx&&d.y===ry),'Rook moved before its castling animation delay');
   clock=a.t0+a.dur;const drawn=G.draw();
   for(const m of a.moves){const p=G.position()[m.to];const [x,y]=G.square('abcdefgh'[m.to&7]+String((m.to>>3)+1));assert.strictEqual(drawn.filter(d=>d.piece===p&&d.x===x&&d.y===y).length,1,'Exactly one piece at the landing square');}
 });
}
test('capture on a1 keeps the victim visible until the attacker arrives',()=>{
 clock=0;G.install('4k3/8/8/8/8/8/r7/R3K3 b - - 0 1');G.move('a2','a1');
 const a=G.animation();clock=a.t0+a.dur*.5;const drawn=G.draw(),[x,y]=G.square('a1');
 assert(drawn.some(d=>d.piece==='R'&&d.x===x&&d.y===y),'Missing captured white rook at a1 during the capture');
 clock=a.t0+a.dur;assert(!G.draw().some(d=>d.piece==='R'),'Captured victim remained after landing');
});
test('unchanged board repaint reuses texture patterns',()=>{
 G.newGame();G.draw();const count=patternCount;G.draw();assert.strictEqual(patternCount,count,'Repainting regenerated board textures');
});
test('each requested animation frame can repaint without an extra empty frame',()=>{
 G.newGame();let count=clearCount;frames.shift()();assert(clearCount>count);
 G.markDirty();count=clearCount;frames.shift()();assert(clearCount>count,'Every other frame was skipped');
});
console.log(JSON.stringify({passed,failures},null,2));
process.exitCode=failures.length?1:0;
