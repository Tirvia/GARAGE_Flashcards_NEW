(function(){
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function wrap(s,cap){const words=s.split(/\s+/),out=[];let line="";for(const w of words){if(line&&(line+" "+w).length>cap){out.push(line);line=w}else line+=(line?" ":"")+w}if(line)out.push(line);return out}
window.GARAGE_answerSrc=function(c){
if(!c)return "";const input=(c.composition||c.answerText||"").trim();if(c.compositionNeedsReview && c.back)return c.back;if(!input)return c.back||"";
const script=document.querySelector("script[src*=menu-data]");
const bg=script?new URL("../images/composition-background.png",script.src).href:new URL("images/composition-background.png",location.href).href;
const rows=input.split(/\r?\n/).filter(x=>x.trim()).map(s=>{const minor=/^\s{2,}[-*+]\s/.test(s),center=/^\s*>/.test(s),note=/^\s*\*/.test(s)&&!/^\s*[-*+]\s/.test(s);return {kind:center?"center":minor?"nested":note?"note":"item",value:s.replace(/^\s*>\s*/,"").replace(/^\s*[-*+]\s+/,"").replace(/^\s*\*(.*?)\*\s*$/,"$1").replace(/\*\*/g,"").trim()}});
function arrange(font){let total=0;const blocks=rows.map(o=>{const size=o.kind==="nested"||o.kind==="note"?font*.82:font;const lineHeight=size*1.32;const width=o.kind==="center"?39:o.kind==="nested"?38:35;const lines=wrap(o.value,width);total+=lines.length*lineHeight+(o.kind==="item"?9:3);return {...o,lines,size,lineHeight}});return {blocks,total}}
let font=c.compositionFont==="small"?29:38,plan=arrange(font);while(font>17&&plan.total>910){font--;plan=arrange(font)}
const allCentered=c.compositionAlign==="center"||(c.compositionAlign!=="left"&&rows.length&&rows.every(r=>r.kind==="center"));let y=allCentered?Math.max(220,(1200-plan.total)/2):Math.max(167,Math.min(240,(1200-plan.total)/2));
const frag=[];for(const b of plan.blocks){const x=allCentered?400:b.kind==="center"?400:b.kind==="nested"?172:120;const marker=allCentered?"":b.kind==="item"?"<circle cx=\"97\" cy=\""+(y+b.size*.55)+"\" r=\"5.5\" fill=\"black\"/>":b.kind==="nested"?"<circle cx=\"146\" cy=\""+(y+b.size*.55)+"\" r=\"4\" fill=\"white\" stroke=\"black\" stroke-width=\"2\"/>":"";frag.push(marker);b.lines.forEach((line,k)=>frag.push("<text x=\""+x+"\" y=\""+(y+b.size+k*b.lineHeight)+"\" font-size=\""+b.size+"\" fill=\"black\" font-family=\"Arial,sans-serif\" "+(allCentered||b.kind==="center"?"text-anchor=\"middle\"":"")+">"+esc(line)+"</text>"));y+=b.lines.length*b.lineHeight+(b.kind==="item"?9:3)}
const titleLines=wrap(c.title||"",25),ts=titleLines.length>1?43:48;const heading=titleLines.map((line,k)=>"<text x=\"400\" y=\""+(titleLines.length>1?107+k*58:99)+"\" font-size=\""+ts+"\" font-family=\"Arial,sans-serif\" text-anchor=\"middle\" font-weight=\"bold\">"+esc(line)+"</text>").join("");
const svg="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 1200\" width=\"800\" height=\"1200\">"+heading+frag.join("")+"</svg>";
return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
};
})();