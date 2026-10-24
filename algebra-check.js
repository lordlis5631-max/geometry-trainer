'use strict';
/* Restricted polynomial/rational parser. No eval, scripts, or sampled equality. */
window.checkAlgebraExpression=(()=>{
 const trim=p=>{while(p.length>1&&p.at(-1)===0n)p.pop();return p;};
 const zero=p=>p.length===1&&p[0]===0n;
 const guard=p=>{if(p.length>65||p.some(c=>c.toString().length>1500))throw Error('Выражение слишком сложное');return trim(p);};
 const add=(a,b)=>guard(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0n)+(b[i]||0n)));
 const neg=a=>a.map(c=>-c);
 const mul=(a,b)=>{if(a.length+b.length>66)throw Error('Слишком высокая степень');const c=Array(a.length+b.length-1).fill(0n);a.forEach((x,i)=>b.forEach((y,j)=>c[i+j]+=x*y));return guard(c);};
 const rat=(n,d=[1n])=>{if(zero(d))throw Error('Деление на нулевое выражение');return {n:guard(n),d:guard(d)};};
 const plus=(a,b)=>rat(add(mul(a.n,b.d),mul(b.n,a.d)),mul(a.d,b.d));
 const times=(a,b)=>rat(mul(a.n,b.n),mul(a.d,b.d));
 const over=(a,b)=>rat(mul(a.n,b.d),mul(a.d,b.n));
 function parse(source){
  if(String(source).length>350)throw Error('Слишком длинная запись');
  const clean=String(source).toLowerCase().replace(/−|–/g,'-').replace(/·|×/g,'*').replace(/÷|:/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/⁴/g,'^4').replace(/,/g,'.').replace(/\[/g,'(').replace(/\]/g,')').replace(/\s/g,'');
  const tokens=clean.match(/(?:\d+(?:\.\d*)?|\.\d+)|x|[()+*/^\-]/g)||[];
  if(tokens.join('')!==clean||!tokens.length||tokens.length>180)throw Error('Используй числа, x, скобки и знаки + − * / ^');
  if(tokens.some((t,i)=>i>0&&/^[\d.]/.test(t)&&/^[\d.]/.test(tokens[i-1])))throw Error('Проверь запись десятичного числа');
  let pos=0;
  const peek=()=>tokens[pos];
  const take=()=>tokens[pos++];
  function primary(){
   const token=take();
   if(token==='x')return rat([0n,1n]);
   if(token==='('){const a=expression();if(take()!==')')throw Error('Проверь закрывающие скобки');return a;}
   if(token&&/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)){const parts=token.split('.'),dec=parts[1]||'';if(token.length>30)throw Error('Слишком длинное число');return rat([BigInt((parts[0]||'0')+dec)],[10n**BigInt(dec.length)]);}
   throw Error('Здесь нужно число, x или скобки');
  }
  function power(){let a=primary();if(peek()==='^'){take();let sign=1;if(peek()==='+')take();else if(peek()==='-'){take();sign=-1;}const exp=take();if(!exp||!/^\d+$/.test(exp)||Number(exp)>12)throw Error('Показатель степени — целое число от −12 до 12');let n=Number(exp),b=rat([1n]);if(sign<0)a=over(rat([1n]),a);while(n-->0)b=times(b,a);a=b;}return a;}
  function unary(){if(peek()==='+'){take();return unary();}if(peek()==='-'){take();const a=unary();return rat(neg(a.n),a.d);}return power();}
  function term(){let a=unary();while(pos<tokens.length){const token=peek();if(token==='*'){take();a=times(a,unary());}else if(token==='/'){take();a=over(a,unary());}else if(token==='('||token==='x'||/^(?:\d|\.)/.test(token)){a=times(a,unary());}else break;}return a;}
  function expression(){let a=term();while(peek()==='+'||peek()==='-'){const op=take(),b=term();a=plus(a,op==='-'?rat(neg(b.n),b.d):b);}return a;}
  const result=expression();if(pos!==tokens.length)throw Error('Проверь порядок знаков и скобок');return result;
 }
 return (input,expected)=>{try{const a=parse(input),b=parse(expected);return {ok:zero(add(mul(a.n,b.d),neg(mul(b.n,a.d))))};}catch(e){return {ok:false,error:e.message};}};
})();
