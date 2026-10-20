const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const b=(quantity,face)=>({quantity,face});
test('完整与两种整手重摇样本空间',()=>{assert.equal(E.oneDistribution(2,true,{straight:'none'}).accepted,7776n);assert.equal(E.oneDistribution(2,true).accepted,7056n);assert.equal(E.oneDistribution(2,true,{straight:'consecutive'}).accepted,7536n);});
test('飞贡献直方图独立核对值',()=>{assert.deepEqual(E.oneDistribution(2,true,{straight:'none'}).counts,[1024n,2560n,2560n,1280n,320n,25n,5n,2n]);assert.deepEqual(E.oneDistribution(2,true).counts,[1024n,2320n,2080n,1280n,320n,25n,5n,2n]);});
test('花豹、纯豹、围1与斋分离',()=>{assert.equal(E.score([2,2,2,2,1],2,true),6);assert.equal(E.score([2,2,2,2,1],2,false),4);assert.equal(E.score([2,2,2,2,1],1,true),1);assert.equal(E.score([2,2,2,2,2],2,true),7);assert.equal(E.score([1,1,1,1,1],2,true),7);assert.equal(E.score([1,1,1,1,1],2,false),0);assert.equal(E.score([1,1,1,1,1],1,false),5);});
test('不启用加成只算真实贡献',()=>{assert.equal(E.score([2,2,2,2,1],2,true,false),5);assert.equal(E.score([1,1,1,1,1],3,true,false),5);});
test('用户确认的同数量抬点合法',()=>{assert.ok(E.legal(b(5,5),b(5,6),4));assert.ok(E.legal(b(6,3),b(6,4),4));assert.ok(!E.legal(b(5,5),b(5,5),4));});
test('门槛及飞不可退斋',()=>{assert.ok(!E.validBid(b(4,4),4));assert.ok(E.validBid(b(5,4),4));assert.ok(E.validBid(b(6,2),10));assert.ok(!E.legal(b(6,3),b(7,1),4));assert.ok(E.legal(b(5,6),b(6,2),4));assert.equal(E.mode(b(6,1)),'zhai');});
test('1为最低且叫1仍守斋门槛',()=>{assert.ok(!E.legal(b(5,3),b(5,1),4));assert.ok(E.legal(b(5,1),b(5,2),4));assert.ok(!E.validBid(b(3,1),4));assert.ok(E.validBid(b(6,1),4));});
test('已知手牌为顺子拒绝计算',()=>{assert.throws(()=>E.analyze([1,2,3,4,6],4,b(6,3)),/顺子/);assert.doesNotThrow(()=>E.analyze([1,2,3,4,6],4,b(6,3),{straight:'consecutive'}));});
test('普通模型与独立二项公式交叉核对',()=>{const a=E.analyze([1,1,1,1,1],2,b(6,2),{straight:'none',bonus:false});assert.ok(Math.abs(a.pTrue-(1-(2/3)**5))<1e-12);});
test('确定成立与超过上限必假',()=>{assert.equal(E.analyze([2,2,2,2,2],2,b(7,2)).pTrue,1);assert.equal(E.analyze([2,2,2,2,2],2,b(15,2)).pTrue,0);});
test('叫1不使用五个1的七点加成',()=>{const a=E.analyze([1,1,1,1,1],2,b(6,1));assert.equal(a.own,5);assert.ok(a.pTrue<1);});
test('多玩家卷积质量守恒及双手直接交叉核对',()=>{const one=E.oneDistribution(2,true);const two=E.unknownDistribution(2,2,true);assert.equal(two.counts.reduce((a,b)=>a+b,0n),7056n**2n);let pairs=0n;for(let i=0;i<8;i++)for(let j=0;j<8;j++)if(i+j>=10)pairs+=one.counts[i]*one.counts[j];const a=E.analyze([3,3,3,3,3],3,b(10,2));assert.equal(a.numerator*two.denominator,pairs*a.denominator);});
test('成立右尾单调',()=>{let last=1;for(let q=6;q<=30;q++){const a=E.analyze([1,3,3,5,6],4,b(q,3));assert.ok(a.pTrue<=last+1e-15);last=a.pTrue;}});
test('合法加叫排序且不产生飞退斋',()=>{const out=E.raises([1,3,3,5,6],4,b(6,3));assert.ok(out.length>0);for(let i=0;i<out.length;i++){assert.ok(E.legal(b(6,3),out[i].bid,4));if(i)assert.ok(out[i].immediateOpenLoss>=out[i-1].immediateOpenLoss-1e-15);}});
test('开批反批是损失而非收益',()=>{const a=E.analyze([1,3,3,5,6],4,b(6,3));assert.ok(a.openLoss<=a.piLoss);assert.ok(a.acceptPiLoss<=a.counterLoss);});
test('显式选择斋飞不能覆盖自动房规',()=>{const h=[1,3,3,5,6];assert.equal(E.analyze(h,4,{quantity:5,face:3,declaredMode:'zhai'}).own,2);assert.equal(E.analyze(h,4,{quantity:6,face:3,declaredMode:'fly'}).own,3);assert.throws(()=>E.analyze(h,4,{quantity:6,face:3,declaredMode:'zhai'}),/必须为飞/);assert.throws(()=>E.analyze(h,4,{quantity:6,face:1,declaredMode:'fly'}),/叫1始终为斋/);assert.ok(!E.validBid({quantity:6,face:3,declaredMode:'zhai'},4));});
test('极小失败概率不被1-p舍入为0',()=>{const a=E.analyze([1,1,1,1,1],20,b(8,2));assert.ok(a.falseCount>0n);assert.ok(a.pFalse>0);assert.equal(a.certainTrue,false);assert.equal(a.certainFalse,false);});
test('数学确定性用整数判断',()=>{const yes=E.analyze([2,2,2,2,2],2,b(7,2)),no=E.analyze([2,2,2,2,2],2,b(15,2));assert.ok(yes.certainTrue);assert.ok(no.certainFalse);assert.equal(yes.falseCount,0n);assert.equal(no.trueCount,0n);});
test('中央90%离散区间确实至少覆盖90%',()=>{const a=E.analyze([1,3,3,5,6],4,b(6,3)),d=E.unknownDistribution(3,3,true);let inside=0n;for(let i=0;i<d.counts.length;i++)if(i+a.own>=a.interval[0]&&i+a.own<=a.interval[1])inside+=d.counts[i];assert.ok(inside*10n>=d.denominator*9n);assert.ok(a.mean>=a.own);});
test('条件事件k=0逐分数等价于基础模型',()=>{const h=[1,3,3,5,6],a=E.analyze(h,4,b(6,3)),z=E.analyze(h,4,b(6,3),{},{face:3,fly:true,min:0});assert.equal(a.numerator,z.numerator);assert.equal(a.denominator,z.denominator);});
test('条件模型跨点数跨斋飞与独立逐手枚举一致',()=>{
 const h=[1,1,1,1,1],cases=[{face:1,fly:false,min:2},{face:3,fly:false,min:2},{face:3,fly:true,min:3},{face:2,fly:true,min:6},{face:6,fly:true,min:7}],bids=[b(3,1),b(3,3),b(6,2),b(8,3),b(9,6)];
 for(const signal of cases)for(const bid of bids){let accepted=0n,trueCount=0n;for(let code=0;code<7776;code++){let value=code;const other=[];for(let j=0;j<5;j++){other.push(value%6+1);value=Math.floor(value/6);}if(new Set(other).size===5)continue;
   const contribution=(dice,face,fly)=>{const c=Array(7).fill(0);dice.forEach(d=>c[d]++);if(face===1||!fly)return c[face];if(c[1]===5||c[face]===5)return 7;if(c[face]===4&&c[1]===1)return 6;return c[face]+c[1];};
   if(contribution(other,signal.face,signal.fly)<signal.min)continue;accepted++;if(contribution(other,bid.face,E.mode(bid)==='fly')+contribution(h,bid.face,E.mode(bid)==='fly')>=bid.quantity)trueCount++;
 }const a=E.analyze(h,2,bid,{},signal);assert.equal(a.trueCount,trueCount);assert.equal(a.rawDenominator,accepted);}
});
test('条件质量守恒及不可能事件拒绝',()=>{const s={face:3,fly:true,min:2},d=E.unknownDistribution(3,2,true,{},s);assert.equal(d.counts.reduce((a,b)=>a+b,0n),d.denominator);assert.equal(d.denominator,d.conditionedAccepted*7056n**2n);assert.throws(()=>E.analyze([1,3,3,5,6],4,b(5,3),{},{face:3,fly:false,min:6}),/不可能/);});
test('两种目标确实可能给出不同决策',()=>{const h=[1,1,1,1,1],a=E.analyze(h,2,b(8,6)),best=E.raises(h,2,b(8,6))[0];assert.deepEqual(best.bid,b(9,2));assert.equal(E.decide('respond',a,best,'cups').action,'open');assert.equal(E.decide('respond',a,best,'win').action,'raise');});
test('认输是少杯选项而不是提高不喝概率',()=>{const a=E.analyze([2,2,2,2,2],2,b(15,2));assert.equal(E.decide('defend',a,null,'cups',true).action,'surrender');assert.equal(E.decide('defend',a,null,'win',true).action,'accept');assert.equal(E.decide('defend',a,null,'cups',false).action,'accept');});
test('默认案例的一轮建议与首叫',()=>{const h=[1,3,3,5,6],a=E.analyze(h,4,b(6,3)),best=E.raises(h,4,b(6,3))[0];assert.equal(E.decide('respond',a,best,'cups').action,'raise');assert.equal(E.decide('opening',null,E.raises(h,4,null)[0]).action,'raise');assert.equal(E.decide('respond',a,null).action,'open');});
console.log(checks+'项数学/房规测试通过');
