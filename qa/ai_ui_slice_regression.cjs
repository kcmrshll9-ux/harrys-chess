'use strict';
// Verify that the UI search resumes at the next root and never trusts an incomplete pass.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};
function load(clock){
  const ctx=new Proxy({},{get:(_,k)=>/Gradient/.test(k)?()=>({addColorStop:noop}):noop,set:()=>true});
  const el=()=>({style:{},dataset:{},classList:{add:noop,remove:noop,contains:()=>false},clientWidth:640,clientHeight:640,getContext:()=>ctx,addEventListener:noop,appendChild:noop,remove:noop,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0}),hasPointerCapture:()=>false});
  const els=new Map(),document={addEventListener:noop,getElementById:id=>{if(!els.has(id))els.set(id,el());return els.get(id);},querySelectorAll:()=>[],createElement:el};
  const math=Object.create(Math);math.random=()=>0.5;
  return new Function('document','window','requestAnimationFrame','setTimeout','clearTimeout','performance','Math',source+`
    return {get:()=>S,legalMoves,makeState,aiSearchTick,searchState:()=>aiSearch,replaceSearch:f=>{searchNodes=f;}};
  `)(document,{devicePixelRatio:1,addEventListener:noop},noop,()=>0,noop,clock,math);
}
const reports=[];
function test(name,fn){try{reports.push({name,...fn(),status:'PASS'});}catch(e){reports.push({name,status:'FAIL',error:e.stack});}}
test('every root is evaluated once per iteration and partial deeper scores are ignored',()=>{
  let now=0,calls=[];const g=load({now:()=>now}),s=g.get(),roots=g.legalMoves(s.b,s.ep,s.cast,'w');
  const positions=roots.map(m=>JSON.stringify(g.makeState(s.b,s.ep,s.cast,m).b));
  g.replaceSearch(function*(b,ep,cast,d){
    const root=positions.indexOf(JSON.stringify(b));assert(root>=0);
    calls.push({root,depth:d});
    if(calls.length===roots.length+5)now=901;
    return {score:d===0?(root===1?100:0):(root===0?200:0)};
  });
  let result;for(let i=0;i<roots.length+8;i++){result=g.aiSearchTick(s.b,s.ep,s.cast,3,'w');if(result.done)break;}
  assert(result.done);assert.equal(result.mv.from,roots[1].from);assert.equal(result.mv.to,roots[1].to);
  const shallow=calls.filter(c=>c.depth===0).map(c=>c.root),deep=calls.filter(c=>c.depth===1).map(c=>c.root);
  assert.deepEqual(shallow,roots.map((_,i)=>i));assert.deepEqual(deep,[1,0,2,3,4]);
  return {rootCount:roots.length,depthOneRoots:shallow.length,partialDepthTwoRoots:deep};
});
test('a long root resumes across slices, and deadline keeps the last complete pass',()=>{
  let now=0,resumes=0;const starts=[];
  const g=load({now:()=>now}),s=g.get(),roots=g.legalMoves(s.b,s.ep,s.cast,'w');
  const positions=roots.map(m=>JSON.stringify(g.makeState(s.b,s.ep,s.cast,m).b));
  g.replaceSearch(function*(b,ep,cast,d){
    const root=positions.indexOf(JSON.stringify(b));starts.push({root,depth:d});
    if(d===1)for(let i=0;i<3;i++){now+=20;resumes++;yield null;}
    return {score:d===0?(root===1?100:0):(root===0?200:0)};
  });
  let result;for(let i=0;i<60;i++){result=g.aiSearchTick(s.b,s.ep,s.cast,3,'w');if(result.done)break;}
  assert(result.done);assert.equal(result.depth,1);assert.equal(result.mv.from,roots[1].from);assert.equal(result.mv.to,roots[1].to);
  const deep=starts.filter(s=>s.depth===1).map(s=>s.root);assert.equal(new Set(deep).size,deep.length);
  assert(resumes>deep.length);assert.deepEqual(deep.slice(0,3),[1,0,2]);
  return {rootCount:roots.length,deepRootsStarted:deep.length,resumes};
});
console.log(JSON.stringify(reports,null,2));
if(reports.some(r=>r.status==='FAIL'))process.exitCode=1;
