(function(root){
  'use strict';
  const defaults={straight:'distinct',bonus:true,onesAfterFly:false};
  const cache=new Map();
  function rules(r){return Object.assign({},defaults,r);}
  function hand(h){if(!Array.isArray(h)||h.length!==5||h.some(x=>!Number.isInteger(x)||x<1||x>6))throw Error('手牌必须恰好为5颗，点数在1–6之间。');return h;}
  function rejected(h,r){const a=[...new Set(h)].sort((a,b)=>a-b);return r.straight==='distinct'?a.length===5:r.straight==='consecutive'&&a.length===5&&(a.join('')==='12345'||a.join('')==='23456');}
  function mode(b){return b.face!==1&&b.quantity>=6?'fly':'zhai';}
  function score(h,face,fly,bonus=true){const c=Array(7).fill(0);for(const d of h)c[d]++;if(face===1||!fly)return c[face];if(bonus){if(c[1]===5||c[face]===5)return 7;if(c[face]===4&&c[1]===1)return 6;}return c[face]+c[1];}
  function validBid(b,n){return !!b&&Number.isInteger(b.quantity)&&b.quantity>=1&&b.quantity<=999&&Number.isInteger(b.face)&&b.face>=1&&b.face<=6&&(!b.declaredMode||b.declaredMode==='auto'||b.declaredMode===mode(b))&&(mode(b)==='fly'||b.quantity>=n+1);}
  function legal(prev,next,n,r={}){r=rules(r);if(!validBid(next,n))return false;if(!prev)return true;if(!validBid(prev,n))return false;if(mode(prev)==='fly'&&mode(next)==='zhai'&&!(r.onesAfterFly&&next.face===1&&next.quantity>prev.quantity))return false;return next.quantity>prev.quantity||next.quantity===prev.quantity&&next.face>prev.face;}
  function oneDistribution(face,fly,opts={},signal=null){const r=rules(opts),key=JSON.stringify([face,fly,r.bonus,r.straight,signal]);if(cache.has(key))return cache.get(key);const counts=Array(8).fill(0n);let accepted=0n;for(let code=0;code<7776;code++){let v=code;const h=[];for(let i=0;i<5;i++){h.push(v%6+1);v=Math.floor(v/6);}if(rejected(h,r))continue;if(signal&&score(h,signal.face,signal.fly,r.bonus)<signal.min)continue;counts[score(h,face,fly,r.bonus)]++;accepted++;}const out={counts,accepted};cache.set(key,out);return out;}
  function convolve(a,b){const c=Array(a.length+b.length-1).fill(0n);for(let i=0;i<a.length;i++)if(a[i])for(let j=0;j<b.length;j++)if(b[j])c[i+j]+=a[i]*b[j];return c;}
  function unknownDistribution(n,face,fly,r={},signal=null){const one=oneDistribution(face,fly,r);const key='multi'+JSON.stringify([n,face,fly,rules(r),signal]);if(cache.has(key))return cache.get(key);let counts=[1n];for(let i=0;i<n-(signal?1:0);i++)counts=convolve(counts,one.counts);let conditioned=null;if(signal){if(n<1||!Number.isInteger(signal.face)||signal.face<1||signal.face>6||typeof signal.fly!=='boolean'||!Number.isInteger(signal.min)||signal.min<0||signal.min>7)throw Error('上家线索参数不合法。');conditioned=oneDistribution(face,fly,r,signal);if(conditioned.accepted===0n)throw Error('这个上家贡献假设不可能成立，请降低数量或关闭线索。');counts=convolve(counts,conditioned.counts);}const out={counts,denominator:one.accepted**BigInt(n-(signal?1:0))*(conditioned?conditioned.accepted:1n),accepted:one.accepted,conditionedAccepted:conditioned?conditioned.accepted:null};cache.set(key,out);return out;}
  function gcd(a,b){while(b){const c=a%b;a=b;b=c;}return a;}
  function analyze(h,n,b,r={},signal=null){hand(h);r=rules(r);if(!Number.isInteger(n)||n<2||n>20)throw Error('人数须为2–20。');if(rejected(h,r))throw Error('这手是需重摇的顺子。请输入重摇后最终手牌，或修改顺子规则。');if(b&&b.declaredMode&&b.declaredMode!=='auto'&&b.declaredMode!==mode(b))throw Error(b.face===1?'叫1始终为斋，不能选择飞。':b.quantity>=6?'非1点数数量≥6必须为飞，不能选择斋。':'非1点数数量小于6属于斋，不能选择飞。');if(!validBid(b,n))throw Error('叫法不合法：本局斋至少'+(n+1)+'个；非1点数飞从6起，叫1始终为斋。');const fly=mode(b)==='fly',own=score(h,b.face,fly,r.bonus),dist=unknownDistribution(n-1,b.face,fly,r,signal);let numerator=0n;for(let i=Math.max(0,b.quantity-own);i<dist.counts.length;i++)numerator+=dist.counts[i];const falseNumerator=dist.denominator-numerator,g=gcd(numerator,dist.denominator),p=Number(numerator)/Number(dist.denominator),f=Number(falseNumerator)/Number(dist.denominator);let sum=0n,cumulative=0n,low=null,high=null;for(let i=0;i<dist.counts.length;i++){sum+=BigInt(i+own)*dist.counts[i];cumulative+=dist.counts[i];if(low===null&&cumulative*20n>=dist.denominator)low=i+own;if(high===null&&cumulative*20n>=dist.denominator*19n)high=i+own;}return {bid:b,mode:mode(b),own,pTrue:p,pFalse:f,numerator:numerator/g,denominator:dist.denominator/g,trueCount:numerator,falseCount:falseNumerator,rawDenominator:dist.denominator,certainTrue:falseNumerator===0n,certainFalse:numerator===0n,accepted:dist.accepted,conditionedAccepted:dist.conditionedAccepted,mean:Number(sum)/Number(dist.denominator),interval:[low,high],openLoss:.5*p,piLoss:p,acceptPiLoss:f,counterLoss:2*f,immediateOpenLoss:.5*f};}
  function fractionCompare(an,ad,bn,bd){const d=an*bd-bn*ad;return d<0n?-1:d>0n?1:0;}
  function raises(h,n,prev,r={},signal=null){const out=[],start=prev?prev.quantity:1,end=Math.max(7*n+1,start+1);for(let q=start;q<=end;q++)for(let f=1;f<=6;f++){const b={quantity:q,face:f};if(legal(prev,b,n,r))out.push(analyze(h,n,b,r,signal));}return out.sort((a,b)=>fractionCompare(a.falseCount,a.rawDenominator,b.falseCount,b.rawDenominator)||a.bid.quantity-b.bid.quantity||a.bid.face-b.bid.face);}
  // This is an explicitly bounded, immediate-reveal comparison, not a full-game policy.
  function decide(phase,current,best,objective='cups',surrender=false){
    if(!['cups','win'].includes(objective))throw Error('决策目标不合法。');
    if(phase==='opening')return {action:best?'raise':'none',best};
    if(phase==='defend'){const cmp=objective==='cups'&&surrender?fractionCompare(current.falseCount,current.rawDenominator,1n,2n):-1;return {action:cmp>0?'surrender':'accept',tie:cmp===0};}
    if(phase!=='respond')throw Error('阶段不合法。');
    if(!best)return {action:'open'};
    // Next opponent either opens for half a cup or calls pi; accept pi.
    // Worst immediate cup loss is P(new bid false); drinking risk is the same in both.
    const cmp=fractionCompare(best.falseCount,best.rawDenominator,current.trueCount,current.rawDenominator*(objective==='cups'?2n:1n));
    return {action:cmp<0?'raise':'open',tie:cmp===0,best};
  }
  const api={defaults,hand,rejected,mode,score,validBid,legal,oneDistribution,convolve,unknownDistribution,analyze,raises,fractionCompare,decide};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DiceAdvisor=api;
})(typeof globalThis!=='undefined'?globalThis:this);
