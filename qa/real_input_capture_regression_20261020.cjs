'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};let clock=0,nextTimer=1;const handlers={},timers=new Map(),els={};
const ctx=new Proxy({}, {get:(_,k)=>k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop:noop}):k==='createPattern'?()=>({}):noop,set:()=>true});
const document={hidden:false,activeElement:null,getElementById:id=>els[id]||(els[id]=el(id)),createElement:tag=>el(tag),querySelectorAll:()=>[],addEventListener:(type,fn)=>handlers['doc/'+type]=fn};
function el(id){return {id,hidden:true,style:{},dataset:{},classList:{add:noop,remove:noop,contains:()=>false},setAttribute:noop,appendChild:noop,remove:noop,querySelectorAll:()=>[],getContext:()=>ctx,clientWidth:640,clientHeight:640,width:640,height:640,getBoundingClientRect:()=>({left:0,top:0,width:640,height:640}),hasPointerCapture:()=>false,releasePointerCapture:noop,setPointerCapture:noop,focus(){document.activeElement=this;},addEventListener:(type,fn)=>handlers[id+'/'+type]=fn};}
const window={devicePixelRatio:1,addEventListener:(type,fn)=>handlers['win/'+type]=fn};
const G=new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','performance',source+`
return {status:window.__game.status,board:()=>S.b.slice(),captures:()=>JSON.parse(JSON.stringify(captured)),pending:()=>pendingPromotion,drag:()=>drag&&({...drag}),
 install(fen){resetGame();const p=fen.split(' '),b=Array(64).fill(null);p[0].split('/').forEach((row,r)=>{let f=0;for(const ch of row){if(/[1-8]/.test(ch))f+=Number(ch);else b[(7-r)*8+f++]=ch;}});const rights=p[2];S={b,turn:p[1],ep:p[3]==='-'?null:FILES.indexOf(p[3][0])+8*(Number(p[3][1])-1),cast:{K:{w:rights.includes('K'),b:rights.includes('k')},Q:{w:rights.includes('Q'),b:rights.includes('q')}},half:0,lastMove:null,pgn:[],over:null,posHist:[]};},
 newGame:()=>newGame(),watch(value){autoplayActive=value;},animation:()=>anim,
 direct(from,to){const n=s=>FILES.indexOf(s[0])+8*(Number(s[1])-1);applyMove(legalMoves(S.b,S.ep,S.cast,S.turn).find(m=>m.from===n(from)&&m.to===n(to)));}
};`)(document,window,noop,(fn,ms)=>{const id=nextTimer++;timers.set(id,{fn,ms});return id;},id=>timers.delete(id),{now:()=>clock});
const square=s=>'abcdefgh'.indexOf(s[0])+8*(Number(s[1])-1);
const event=(sq,extra={})=>{const i=square(sq);return {clientX:((i&7)+.5)*80,clientY:(7-(i>>3)+.5)*80,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,preventDefault:noop,...extra};};
function dispatch(type,sq,extra){handlers['board/'+type](event(sq,extra));}
function pointerMove(from,to,mode){dispatch('pointerdown',from);if(mode==='click'){dispatch('pointerup',from);dispatch('pointerdown',to);}else dispatch('pointermove',to);dispatch('pointerup',to);}
function key(key,extra={}){handlers['doc/keydown']({key,preventDefault:noop,...extra});}
function typeSquare(sq){key(sq[0]);key(sq[1]);}
const failures=[],passed=[];
function test(name,fn){try{fn();passed.push(name);}catch(error){failures.push({name,error:error.stack});}}
function clean(){const s=G.status();assert.strictEqual(s.sel,null);assert.strictEqual(s.kbSel,null);assert.strictEqual(s.drag,null);assert.strictEqual(s.touched,null);}
const cases=[
 ['pawn left','7k/8/8/3p1p2/4P3/8/8/K7 w - - 0 1','e4','d5','P','exd5'],
 ['pawn right','7k/8/8/3p1p2/4P3/8/8/K7 w - - 0 1','e4','f5','P','exf5'],
 ['knight','7k/8/5p2/8/4N3/8/8/K7 w - - 0 1','e4','f6','N','Nxf6'],
 ['bishop','7k/8/5p2/8/8/2B5/8/K7 w - - 0 1','c3','f6','B','Bxf6+'],
 ['rook','7k/8/3p4/8/8/8/3R4/K7 w - - 0 1','d2','d6','R','Rxd6'],
 ['queen','7k/8/8/6p1/8/8/3Q4/K7 w - - 0 1','d2','g5','Q','Qxg5'],
 ['king','7k/8/8/8/8/4p3/4K3/8 w - - 0 1','e2','e3','K','Kxe3'],
 ['en passant','7k/8/8/3pP3/8/8/8/K7 w - d6 0 1','e5','d6','P','exd6','d5']
];
for(const mode of ['click','drag'])for(const [name,fen,from,to,piece,san,victim] of cases)test(mode+' '+name+' capture',()=>{
 G.install(fen);pointerMove(from,to,mode);const board=G.board();
 assert.strictEqual(board[square(from)],null);assert.strictEqual(board[square(to)],piece);
 if(victim)assert.strictEqual(board[square(victim)],null);
 assert.deepStrictEqual(G.status().pgnList,[san]);assert.deepStrictEqual(G.captures(),{w:[],b:['♟']});clean();
});
for(const mode of ['click','drag'])for(const piece of ['q','r','b','n'])test(mode+' promotion capture to '+piece,()=>{
 G.install('k6r/6P1/8/8/8/8/8/K7 w - - 0 1');pointerMove('g7','h8',mode);
 assert(G.pending());assert.strictEqual(G.board()[square('g7')],'P');assert.strictEqual(G.board()[square('h8')],'r');assert.deepStrictEqual(G.status().pgnList,[]);
 handlers['promote'+piece.toUpperCase()+'/click']({});
 assert.strictEqual(G.board()[square('g7')],null);assert.strictEqual(G.board()[square('h8')],piece.toUpperCase());
 assert.deepStrictEqual(G.status().pgnList,['gxh8='+piece.toUpperCase()+(['q','r'].includes(piece)?'+':'')]);assert.deepStrictEqual(G.captures().b,['♜']);assert.strictEqual(G.pending(),null);clean();
});
test('own piece can be reselected',()=>{G.newGame();dispatch('pointerdown','e2');dispatch('pointerup','e2');dispatch('pointerdown','g1');dispatch('pointerup','g1');assert.strictEqual(G.status().sel,square('g1'));dispatch('pointerdown','f3');dispatch('pointerup','f3');assert.deepStrictEqual(G.status().pgnList,['Nf3']);clean();});
test('foreign pointer cannot move, replace, or release an owned drag',()=>{G.newGame();dispatch('pointerdown','e2');const original=G.drag();dispatch('pointerdown','d2',{pointerId:2,isPrimary:false});dispatch('pointermove','h4',{pointerId:2,isPrimary:false});dispatch('pointerup','e4',{pointerId:2,isPrimary:false});assert.deepStrictEqual(G.drag(),original);dispatch('pointermove','e4');dispatch('pointerup','e4');assert.deepStrictEqual(G.status().pgnList,['e4']);});
test('right button cannot complete a move',()=>{G.newGame();dispatch('pointerdown','e2');dispatch('pointerup','e4',{button:2});assert.deepStrictEqual(G.status().pgnList,[]);clean();});
test('stray release cannot move a selected piece',()=>{G.newGame();dispatch('pointerdown','e2');dispatch('pointerup','e2');dispatch('pointerup','e4');assert.deepStrictEqual(G.status().pgnList,[]);});
test('new game and blur clear keyboard selection',()=>{G.newGame();typeSquare('e2');assert.strictEqual(G.status().kbSel,square('e2'));G.newGame();typeSquare('g1');assert.strictEqual(G.status().sel,square('g1'));handlers['win/blur']({});clean();typeSquare('e2');assert.strictEqual(G.status().sel,square('e2'));});
test('manual input is ignored while watching',()=>{G.newGame();G.watch(true);pointerMove('e2','e4','click');typeSquare('g1');typeSquare('f3');assert.deepStrictEqual(G.status().pgnList,[]);clean();G.watch(false);});
for(const mode of ['click','drag','keyboard'])test(mode+' source selection settles Harry animation and accepts the next move immediately',()=>{
 G.install('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');G.direct('b8','c6');
 assert(G.animation());assert.strictEqual(G.status().turn,'w');
 if(mode==='keyboard')typeSquare('e4');else dispatch('pointerdown','e4');
 assert.strictEqual(G.animation(),null,'selecting White must finish the previous slide');
 assert.deepStrictEqual(G.status().pgnList,['Nc6']);assert.strictEqual(G.status().sel,square('e4'));
 if(mode==='keyboard')typeSquare('e5');else{if(mode==='click'){dispatch('pointerup','e4');dispatch('pointerdown','e5');}else dispatch('pointermove','e5');dispatch('pointerup','e5');}
 assert.deepStrictEqual(G.status().pgnList,['Nc6','e5']);
 assert.strictEqual(G.animation().moves.length,1);assert.strictEqual(G.animation().moves[0].from,square('e4'));assert.strictEqual(G.animation().moves[0].to,square('e5'));clean();
});
test('animation remains intact for non-source clicks, Black turn, and autoplay',()=>{
 G.install('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');G.direct('b8','c6');
 const blackSlide=G.animation();dispatch('pointerdown','e5');dispatch('pointerup','e5');typeSquare('c6');assert.strictEqual(G.animation(),blackSlide);clean();
 G.watch(true);pointerMove('e4','e5','click');typeSquare('e4');assert.strictEqual(G.animation(),blackSlide);assert.deepStrictEqual(G.status().pgnList,['Nc6']);G.watch(false);
 G.newGame();pointerMove('e2','e4','click');const whiteSlide=G.animation();pointerMove('d2','d4','click');typeSquare('d2');assert.strictEqual(G.animation(),whiteSlide);assert.deepStrictEqual(G.status().pgnList,['e4']);clean();
});
test('keyboard promotion waits for an unmodified explicit piece key',()=>{G.install('k6r/6P1/8/8/8/8/8/K7 w - - 0 1');typeSquare('g7');typeSquare('h8');assert(G.pending());assert.deepStrictEqual(G.status().pgnList,[]);key('r',{ctrlKey:true});assert(G.pending());assert.deepStrictEqual(G.status().pgnList,[]);key('n');assert.deepStrictEqual(G.status().pgnList,['gxh8=N']);clean();});
for(const action of ['escape','new game','undo'])test(action+' cancels pending promotion without moving',()=>{G.install('k6r/6P1/8/8/8/8/8/K7 w - - 0 1');pointerMove('g7','h8','click');assert(G.pending());if(action==='escape')key('Escape');else if(action==='new game')G.newGame();else handlers['undoBtn/click']({});assert.strictEqual(G.pending(),null);assert.deepStrictEqual(G.status().pgnList,[]);clean();});
console.log(JSON.stringify({passed:passed.length,failures},null,2));process.exitCode=failures.length?1:0;
