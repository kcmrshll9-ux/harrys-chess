'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{},els=new Map(),handlers=new Map();
function element(id){return {style:{},dataset:{},classList:{add:noop,remove:noop,contains:()=>false},clientWidth:640,clientHeight:640,getContext:()=>new Proxy({},{get:()=>noop}),addEventListener:(type,fn)=>handlers.set(id+':'+type,fn),appendChild:noop,remove:noop,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0}),setAttribute:noop,click:noop};}
const document={addEventListener:noop,body:{appendChild:noop},getElementById:id=>{if(!els.has(id))els.set(id,element(id));return els.get(id);},querySelectorAll:()=>[],createElement:tag=>element(tag)};
let downloaded=null,revoked=null;
const url={createObjectURL:blob=>{downloaded=blob;return 'blob:game';},revokeObjectURL:value=>{revoked=value;}};
const game=new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','URL','Blob',source+`
return {set:(moves,over)=>{S.pgn=moves;S.over=over;},refreshFooter,gamePgn,formatMoves};`)(document,{devicePixelRatio:1,addEventListener:noop},noop,fn=>{fn();return 0;},noop,url,Blob);
const moves=['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8'];
game.set(moves,{result:'win'});game.refreshFooter();
assert.equal(els.get('movesList').textContent,game.formatMoves(moves));
assert.equal(els.get('hist').textContent,moves.slice(-14).join('  '));
const pgn=game.gamePgn();assert(pgn.includes('1. e4 e5'));assert(pgn.includes('9. h3 Nb8'));assert(pgn.trimEnd().endsWith('1-0'));
for(const tag of ['Event','Site','Date','Round','White','Black','Result'])assert(pgn.includes('['+tag+' '));
handlers.get('pgnBtn:click')();
(async()=>{assert.equal(await downloaded.text(),pgn);assert.equal(revoked,'blob:game');console.log('PASS full move history and downloaded PGN');})().catch(e=>{console.error(e);process.exitCode=1;});
