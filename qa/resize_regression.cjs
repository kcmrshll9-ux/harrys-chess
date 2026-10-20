const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function resize(){'),end=html.indexOf('function sqAt',start);
assert(start>=0&&end>start);
const c={boardwrap:{clientWidth:640,clientHeight:640},canvas:{width:640,height:640,style:{}},fxc:{width:640,height:640,style:{}},window:{devicePixelRatio:1},ctx:{setTransform(){}},lastW:640,lastH:640,dirty:false,DPR:1,SIZE:640,OX:0,OY:0,CELL:80};
vm.createContext(c);vm.runInContext(html.slice(start,end),c);
const results=[];
for(const ratio of [2,1.25,1]){c.dirty=false;c.window.devicePixelRatio=ratio;c.resize();assert(c.dirty,'DPR-only resize must invalidate board at '+ratio);assert.equal(c.canvas.width,Math.round(640*ratio));results.push({ratio,invalidated:c.dirty});c.dirty=false;c.resize();assert.equal(c.dirty,false,'unchanged resize must stay clean');}
c.boardwrap.clientWidth=600;c.resize();assert(c.dirty,'CSS resize must invalidate');
console.log(JSON.stringify({pass:true,scaleCases:results,unchangedSize:true,cssResize:true}));
