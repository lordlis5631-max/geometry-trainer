'use strict';
/* Native MathML: textbook fractions, powers and stretchy fences, with no CDN. */
window.CourseMath=(()=>{
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const supers={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','ⁿ':'n','ᵐ':'m','⁺':'+','⁻':'−'};
 const normalize=s=>String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵐ⁺⁻]+/g,t=>'^('+[...t].map(c=>supers[c]).join('')+')').replace(/−|–/g,'-').replace(/×/g,'·');
 const row=items=>items.length===1?items[0]:{kind:'row',items};
 const op=value=>({kind:'op',value});
 function parse(source,input=false){
  if(source.length>500)throw Error('Too long');
  const clean=input?normalize(source).replace(/\s/g,''):normalize(source),raw=clean.match(/\d+(?:[.,]\d+)?|[A-Za-z]|[()[\]{}+\-*/^·:=≠<>≤≥⇒→↔±,;%]|\s+/g)||[];
  if(!raw.length||raw.join('')!==clean)throw Error('Unsupported notation');
  const tokens=raw.filter(t=>!/^\s+$/.test(t));
  let pos=0;const peek=()=>tokens[pos],take=()=>tokens[pos++];
  const start=t=>!!t&&(/^[A-Za-z\d]/.test(t)||['(','[','{'].includes(t));
  function atom(){const t=take();if(['(','[','{'].includes(t)){const end={'(':')','[':']','{':'}'}[t],body=sequence(end);if(take()!==end)throw Error('Unclosed fence');return {kind:'fence',left:t,right:end,body};}if(t&&/^\d/.test(t))return {kind:'number',value:t};if(t&&/^[A-Za-z]$/.test(t))return {kind:'letter',value:t};throw Error('Missing atom');}
  function power(){let a=atom();if(peek()==='^'){take();a={kind:'power',base:a,exponent:unary()};}return a;}
  function unary(){if(['+','-','±'].includes(peek())){const sign=take();return row([op(sign==='-'?'−':sign),unary()]);}return power();}
  function implicit(){const items=[unary()];while(start(peek()))items.push(power());return row(items);}
  function fraction(){let a=implicit();while(peek()==='/'){take();a={kind:'fraction',top:a,bottom:implicit()};}return a;}
  function product(){if(input){let a=unary();while(peek()==='*'||peek()==='·'||peek()==='/'||start(peek())){if(peek()==='/'){take();a={kind:'fraction',top:a,bottom:unary()};}else{const explicit=peek()==='*'||peek()==='·';if(explicit)take();a=row([a,...(explicit?[op('·')]:[]),unary()]);}}return a;}
   const items=[fraction()];while(peek()==='*'||peek()==='·'||peek()===':'){const symbol=take();items.push(op(symbol==='*'?'·':symbol),fraction());}return row(items);}
  function sum(){const items=[product()];while(peek()==='+'||peek()==='-'){const symbol=take();items.push(op(symbol==='-'?'−':symbol),product());}return row(items);}
  function sequence(end){const items=[];if(!peek()||peek()===end)throw Error('Empty expression');items.push(sum());while(peek()&&peek()!==end){const symbol=take();if(!['=','≠','<','>','≤','≥','⇒','→','↔',',',';','%'].includes(symbol))throw Error('Unexpected token');items.push(op(symbol));if(peek()&&peek()!==end)items.push(sum());}return {kind:'sequence',items};}
  const result=sequence();if(pos!==tokens.length)throw Error('Trailing input');return result;
 }
 const unwrap=a=>a.kind==='fence'?a.body:a;
 function mathML(a){switch(a.kind){
  case 'number':return '<mn>'+escape(a.value)+'</mn>';
  case 'letter':return '<mi>'+escape(a.value)+'</mi>';
  case 'op':return '<mo>'+escape(a.value)+'</mo>';
  case 'fence':return '<mrow><mo stretchy="true" fence="true">'+escape(a.left)+'</mo>'+mathML(a.body)+'<mo stretchy="true" fence="true">'+escape(a.right)+'</mo></mrow>';
  case 'power':return '<msup>'+mathML(a.base)+mathML(unwrap(a.exponent))+'</msup>';
  case 'fraction':return '<mfrac>'+mathML(unwrap(a.top))+mathML(unwrap(a.bottom))+'</mfrac>';
  default:return '<mrow>'+a.items.map(mathML).join('')+'</mrow>';
 }}
 function render(source,{input=false}={}){
  const ast=parse(source,input),parts=[];let current=[];
  for(const item of ast.items){const split=item.kind==='op'&&([',',';'].includes(item.value)||(item.value==='='&&source.length>65));if(split&&current.length){if([',',';'].includes(item.value)){current.push(item);parts.push(current);current=[];continue;}parts.push(current);current=[];}current.push(item);}
  if(current.length)parts.push(current);
  return parts.map(items=>'<span class="math-fragment"><math xmlns="http://www.w3.org/1998/Math/MathML" display="inline" aria-label="'+escape(source)+'"><mstyle displaystyle="true">'+mathML(row(items))+'</mstyle></math></span>').join(' ');
 }
 const runs=/[A-Za-z\d⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵐ⁺⁻()[\]{}+−\-*/^·×:=≠<>≤≥⇒→↔±,;%\s]+/g;
 function formatText(text){
  let html='',cursor=0;
  for(const match of String(text).matchAll(runs)){
   html+=escape(String(text).slice(cursor,match.index));cursor=match.index+match[0].length;
   const source=match[0],leading=source.match(/^[\s:;,]*/)[0],rest=source.slice(leading.length),trailing=rest.match(/[\s:;,]*$/)[0],body=rest.slice(0,rest.length-trailing.length);
   if(!/[A-Za-z]/.test(body)&&!/[\/^⁰¹²³⁴⁵⁶⁷⁸⁹=≠·×]/.test(body)){html+=escape(source);continue;}
   try{html+=escape(leading)+render(body)+escape(trailing);}catch{html+=escape(source);}
  }
  return html+escape(String(text).slice(cursor));
 }
 function format(root){
  const nodes=[];const walk=node=>{for(const child of [...node.childNodes]){if(child.nodeType===3)nodes.push(child);else if(child.nodeType===1&&!child.matches('math,.math-fragment,input,select,option,textarea,code,.answer-preview'))walk(child);}};walk(root);
  for(const node of nodes){if(!/[A-Za-z\/^²³⁴]/.test(node.textContent))continue;const html=formatText(node.textContent);if(!html.includes('<math'))continue;const template=document.createElement('template');template.innerHTML=html;node.replaceWith(template.content);}
 }
 function preview(input){const target=input.closest('.field')?.querySelector('.answer-preview');if(!target)return;const value=input.value.trim();target.hidden=!value;if(!value)return;try{target.innerHTML='<span class="preview-caption">Твоя запись</span>'+render(value,{input:true});}catch{target.innerHTML='<span class="preview-caption">Предпросмотр появится, когда запись будет закончена.</span>';}}
 function enhance(root){
  const topic=location.hash.includes('/topic/algebra-');
  const selectors=topic?'.theory-block p,.formula,.problem-statement,.problem-goal,.proof-step h3,.proof-step p,.answer-box,.strategy,.tip,.hint-text,.lesson-heading h1,.lesson-heading>p,.example-choice strong,.theory-index button,.field label,.graph-title':'.graph-title,.topic-card h3';
  root.querySelectorAll(selectors).forEach(format);
  root.querySelectorAll('input[data-math-answer]').forEach(input=>{preview(input);input.addEventListener('input',()=>preview(input));});
 }
 return {render,formatText,format,enhance};
})();
