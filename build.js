const fs=require('node:fs'),path=require('node:path');
const template=fs.readFileSync(path.join(__dirname,'page.template.html'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'ui.js'),'utf8');
fs.writeFileSync(path.join(__dirname,'五骰子判断器.html'),template.replace('/* ENGINE_PLACEHOLDER */',()=>engine).replace('/* UI_PLACEHOLDER */',()=>ui),'utf8');
console.log('已生成完全离线的五骰子判断器.html');
