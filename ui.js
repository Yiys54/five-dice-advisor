'use strict';
const $=id=>document.getElementById(id),E=DiceAdvisor;
const fmt=a=>a.bid.quantity+'个'+a.bid.face+'，'+(a.mode==='fly'?'飞':'斋');
function percent(p,zero=false,one=false){if(zero)return '0%';if(one)return '100%';if(p<.0001)return '＜0.01%';if(p>.9999)return '＞99.99%';return (p*100).toFixed(2)+'%';}
function chance(a,truth=true){return percent(truth?a.pTrue:a.pFalse,truth?a.certainFalse:a.certainTrue,truth?a.certainTrue:a.certainFalse);}
function cups(x){return x>0&&x<.0001?'＜0.0001杯':x.toFixed(4)+'杯';}
for(let i=0;i<5;i++){
  const s=document.createElement('select');s.id='die'+i;s.setAttribute('aria-label','第'+(i+1)+'颗骰子');
  s.add(new Option('—',''));for(let f=1;f<=6;f++)s.add(new Option(String(f),String(f)));$('dice').appendChild(s);
}
for(let f=1;f<=6;f++)$('face').add(new Option(String(f),String(f)));
try{const saved=JSON.parse(localStorage.getItem('five-dice-settings-v12')||'null');if(saved){if(saved.players>=2&&saved.players<=20)$('players').value=String(saved.players);if(['cups','win'].includes(saved.objective))$('objective').value=saved.objective;}}catch(_){}
const getRules=()=>({straight:$('straight').value,bonus:$('bonus').checked});
function markDirty(){
  const computed=$('results').dataset.computed==='true';
  if(computed){$('results').innerHTML='';$('results').dataset.computed='false';$('stale').hidden=false;}
  $('error').textContent='';
}
function modeHint(){
  const n=Number($('players').value),face=Number($('face').value),q=Number($('quantity').value);
  if(!Number.isInteger(n)||n<2||n>20){$('mode-hint').textContent='人数含自己，支持2–20人。';return;}
  const base=n<=4?'本局非1点数：斋可叫'+(n===4?'5':(n+1)+'–5')+'个，飞从6个起。':'本局非1点数没有合法的斋，飞从6个起。';
  $('mode-hint').textContent=base+'叫1恒斋，至少'+(n+1)+'个。'+(face&&q?'你填的叫法按房规属于'+(E.mode({quantity:q,face})==='fly'?'飞。':'斋。'):'');
}
function stage(){
  const phase=$('phase').value,opening=phase==='opening';
  $('opening-check').hidden=!opening;
  if(opening)$('opening-check').appendChild($('bid-fields'));else $('opening-check').after($('bid-fields'));
  $('bid-label').textContent=opening?'我准备首叫的数量':phase==='defend'?'我刚叫的数量':'上家叫的数量';
  $('signal-fields').hidden=phase!=='respond';modeHint();
}
function table(rows,headers){return '<div class="table-wrap"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(x=>'<tr>'+x.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
function decision(phase,a,best,objective,surrender,signal){
  const d=E.decide(phase,a,best,objective,surrender),target=objective==='cups'?'平均少喝':'本次开盅少输';
  let title='',body='';
  if(d.action==='raise'){
    title=(phase==='opening'?'模型推荐首叫：':'一轮建议：继续叫 ')+fmt(best);
    body='这句成立概率 '+chance(best)+'；你的手牌能算 '+best.own+' 个。';
    body+='下家立即普通开你：喝的概率 '+chance(best,false)+'，平均 '+cups(best.immediateOpenLoss)+'；若立即批你、你接受：平均 '+cups(best.acceptPiLoss)+'。';
    if(phase==='respond')body+='作为对照，现在普通开上家平均 '+cups(a.openLoss)+'。';
  }else if(d.action==='open'){
    title=d.tie?'一轮比较打平：可普通开上家':'一轮建议：普通开上家';
    body='开上家时，你喝半杯的概率是 '+chance(a)+'，平均 '+cups(a.openLoss)+'。';
    if(best)body+='继续叫 '+fmt(best)+' 的输局概率是 '+chance(best,false)+'；若被立即批且接受，平均 '+cups(best.acceptPiLoss)+'。';
  }else if(d.action==='surrender'){
    title='按平均少喝：直接认输半杯';body='认输一定喝半杯；接受批则有 '+chance(a,false)+' 的概率喝1杯，平均 '+cups(a.acceptPiLoss)+'。这是降低平均杯数，不能提高这次不喝的概率。';
  }else if(d.action==='accept'){
    title=d.tie?'平均罚杯相同：可接受批、开盅':'建议接受批，直接开盅';
    body='你的叫法成立概率 '+chance(a)+'；不成立时喝1杯，平均 '+cups(a.acceptPiLoss)+'。反批的输局概率相同，输时改喝2杯。';
  }
  const scope=phase==='defend'?'本次已被批，接受后直接开盅。反批不改变叫法真假。':'比较范围：下家立刻开你，或批你且你接受批。“平均少喝”按其中较高罚杯比较；下家继续叫的后续尚未计算。';
  return '<div class="decision" id="main-advice"><span class="tag">目标：'+target+(signal?' · 含上家贡献假设':' · 只知道自己手牌')+'</span><h2>'+title+'</h2><p>'+body+'</p><small>'+scope+'</small></div>';
}
function compute(){
  $('error').textContent='';$('results').innerHTML='';$('results').dataset.computed='false';$('stale').hidden=true;
  try{
    const values=Array.from({length:5},(_,i)=>$('die'+i).value);
    if(values.some(x=>x===''))throw Error('先选完你的五颗骰子；示例只能用来体验，实际使用要填真实手牌。');
    const h=values.map(Number),n=Number($('players').value),r=getRules(),phase=$('phase').value,objective=$('objective').value,surrender=$('surrender').checked;
    E.hand(h);if(!Number.isInteger(n)||n<2||n>20)throw Error('总人数含自己，请填2–20的整数。');
    if(E.rejected(h,r))throw Error('这手五颗互不相同，按当前顺子规则应重摇。请输入重摇后的最终手牌。');
    const hasBid=$('quantity').value!==''||$('face').value!=='';
    let b=null,a=null,signal=null,prior=null;
    if(phase!=='opening'||$('opening-check').open&&hasBid){
      if(!$('quantity').value||!$('face').value)throw Error('请填全当前叫法：数量和目标点数。');
      b={quantity:Number($('quantity').value),face:Number($('face').value),declaredMode:$('bid-mode').value};
      prior=E.analyze(h,n,b,r);
      const min=Number($('signal-min').value);
      if(phase==='respond'&&min>0)signal={face:b.face,fly:E.mode(b)==='fly',min};
      a=signal?E.analyze(h,n,b,r,signal):prior;
    }
    const choices=phase==='defend'?[]:E.raises(h,n,phase==='respond'?b:null,r,signal),best=choices[0];
    let html=decision(phase,a,best,objective,surrender,signal),shown=a||best;
    if(signal){
      const probability=Number(a.conditionedAccepted)/Number(a.accepted);
      html+='<div class="notice"><strong>当前使用假设：上家对原叫法至少贡献'+signal.min+'个。</strong><p>不加假设时，原叫法成立概率 '+chance(prior)+'；加假设后 '+chance(a)+'。公平摇骰时，符合假设的上家手牌占 '+percent(probability)+'。'+(probability<.05?'这个假设筛掉了超过95%的手牌，结论高度依赖你的判断。':'')+'这不是已经知道他的骰子。</p></div>';
      if(phase==='respond'){
        const baseChoices=E.raises(h,n,b,r),baseDecision=E.decide(phase,prior,baseChoices[0],objective,surrender),signalDecision=E.decide(phase,a,best,objective,surrender);
        if(baseDecision.action!==signalDecision.action||baseDecision.best&&signalDecision.best&&fmt(baseDecision.best)!==fmt(signalDecision.best))html+='<p class="notice">开启线索改变了建议；请先确认这项假设有依据。没有把握时关闭线索，按基础模型查看。</p>';
      }
    }
    html+='<h2>'+(a?(phase==='respond'?'上家叫法：':phase==='defend'?'我刚叫的：':'正在检查的首叫：'):'推荐首叫详情：')+fmt(shown)+'</h2><div class="stats"><div class="stat">叫法成立概率<strong class="value">'+chance(shown)+'</strong></div><div class="stat">叫法不成立概率<strong class="value">'+chance(shown,false)+'</strong></div><div class="stat">你的手牌能算<strong class="value">'+shown.own+'个</strong></div></div>';
    if(shown.certainTrue||shown.certainFalse)html+='<p class="notice">'+(signal?'在上述假设与房规下：':'在当前房规和已知手牌下：')+(shown.certainTrue?'这句在数学上必定成立。':'这句在数学上不可能成立。')+'</p>';
    html+='<p class="muted">全场该目标的有效数量：平均约 '+shown.mean.toFixed(2)+' 个；模型中央90%区间 '+shown.interval[0]+'–'+shown.interval[1]+' 个（离散分布，覆盖率至少90%）。</p>';
    if(phase==='respond'){
      html+='<details><summary>展开看：开和批的差别</summary>'+table([
        ['普通开上家','喝半杯',chance(a),cups(a.openLoss)],
        ['批上家；对方接受','喝1杯',chance(a),cups(a.piLoss)],
        ['批上家；对方反批','喝2杯',chance(a),cups(2*a.piLoss)]
      ],['结算方式','输时罚杯','本模型输局概率','每种固定结算方式下的平均罚杯'])+'<p><small>批不会改变当前叫法真假。以上将结算方式视为固定情景；对方按手牌选择反批会带来额外信息。'+(surrender?'认输房规已开启，批也可能使对方认输；未建模这种行为，不能断言批一定更差。':'在不计威慑和后续收益、对方没有认输选项时，单看自己罚杯，普通开不高于批。')+'</small></p></details>';
    }else if(phase==='defend'){
      html+='<h3>被批后，自己承担多少风险？</h3>'+table([
        ['接受批，开盅',chance(a,false),cups(a.acceptPiLoss)],
        ['反批，开盅',chance(a,false),cups(a.counterLoss)]
      ].concat(surrender?[['直接认输','100%','0.5000杯']]:[]),['动作','自己喝的概率','平均罚杯']);
    }
    if(phase!=='defend'){
      const filter=$('recommend-mode').value,top=choices.filter(x=>filter==='all'||x.mode===filter).slice(0,5);
      html+='<h3>其他合法叫法 · '+(filter==='zhai'?'只看斋':filter==='fly'?'只看飞':'按成立概率排序')+'</h3><p><small>主建议始终比较全部合法叫法；筛选只改变下表。相同概率优先较小数量、较低点数，不代表心理博弈最优。</small></p>';
      if(top.length)html+=table(top.map(x=>[
        '<strong>'+fmt(x)+'</strong>',chance(x),chance(x,false),cups(x.immediateOpenLoss)+' / '+cups(x.acceptPiLoss),'<button type="button" data-pick="'+x.bid.quantity+','+x.bid.face+'">'+(phase==='opening'?'检查首叫':'查看这句')+'</button>'
      ]),['可以叫什么','成立概率','被立即质疑时输局概率','立即被开 / 被批且接受的平均罚杯','查看']);
      else html+='<p>这个筛选下没有合法叫法。'+(a&&a.mode==='fly'&&filter==='zhai'?'已进入飞，不能退斋。':'请改为“全部合法叫法”，或核对人数。')+'</p>';
    }
    html+='<details><summary>查看精确计数与计算依据</summary><p style="overflow-wrap:anywhere">P(成立) = '+shown.numerator+' / '+shown.denominator+'；未知玩家每人基础有效手牌 '+shown.accepted+' 种。'+(signal?'其中指定上家筛选后保留 '+shown.conditionedAccepted+' 种。':'')+'</p><p>0%和100%只在整数计数确实为0或全部时显示。接近边界但仍有风险时显示“＜0.01%”或“＞99.99%”。</p></details>';
    const section=document.createElement('section');section.className='panel';section.innerHTML=html;$('results').appendChild(section);$('results').dataset.computed='true';
    section.querySelectorAll('[data-pick]').forEach(button=>button.addEventListener('click',()=>{
      const [q,f]=button.dataset.pick.split(',').map(Number),picked=choices.find(x=>x.bid.quantity===q&&x.bid.face===f);
      if(phase==='opening'){
        $('quantity').value=String(q);$('face').value=String(f);$('bid-mode').value=picked.mode;$('opening-check').open=true;modeHint();compute();
      }else{
        let info=$('candidate-preview');if(!info){info=document.createElement('div');info.id='candidate-preview';info.className='notice';$('results').prepend(info);}
        info.textContent='可叫：'+fmt(picked)+'。成立 '+chance(picked)+'；下家普通开你时平均 '+cups(picked.immediateOpenLoss)+'，批你且你接受时平均 '+cups(picked.acceptPiLoss)+'。已保留原上家输入，不会把新叫法误当作上家叫法。';
      }
    }));
    try{localStorage.setItem('five-dice-settings-v12',JSON.stringify({players:n,objective}));}catch(_){}
  }catch(err){$('error').textContent=err.message;}
}
for(const event of ['input','change'])$('form').addEventListener(event,ev=>{if(ev.target.matches('input,select')){markDirty();modeHint();}});
$('phase').addEventListener('change',()=>{$('signal-min').value='0';$('quantity').value='';$('face').value='';$('bid-mode').value='auto';$('opening-check').open=false;stage();});
$('form').addEventListener('submit',ev=>{ev.preventDefault();compute();});
$('example').addEventListener('click',()=>{
  [1,3,3,5,6].forEach((v,i)=>$('die'+i).value=String(v));$('players').value='4';$('phase').value='respond';$('quantity').value='6';$('face').value='3';$('bid-mode').value='auto';$('recommend-mode').value='all';$('objective').value='cups';$('straight').value='distinct';$('bonus').checked=true;$('surrender').checked=false;$('signal-min').value='0';$('example-note').hidden=false;stage();compute();
});
$('new-hand').addEventListener('click',()=>{
  for(let i=0;i<5;i++)$('die'+i).value='';$('quantity').value='';$('face').value='';$('bid-mode').value='auto';$('signal-min').value='0';$('example-note').hidden=true;markDirty();modeHint();$('die0').focus();
});
stage();
