/* Composition renderer. Original frame is a CSS background of the back-side image. */
(function () {
  'use strict';
  const xml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function width(text,size,italic,bold) {
    if (!ctx) return Array.from(text).length * size * .56;
    ctx.font = (italic ? 'italic ' : '') + (bold ? 'bold ' : '') + size + 'px Arial, sans-serif';
    return ctx.measureText(text).width;
  }

  function inlines(value) {
    const chunks=[], pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    let last=0;
    for(const match of value.matchAll(pattern)) {
      if(match.index>last) chunks.push({text:value.slice(last,match.index),italic:false,bold:false,small:false});
      const token=match[0],bold=token.startsWith('**');
      chunks.push({text:token.slice(bold?2:1,bold?-2:-1),italic:!bold,bold,small:!bold});
      last=match.index+token.length;
    }
    if(last<value.length)chunks.push({text:value.slice(last),italic:false,bold:false,small:false});
    return chunks;
  }

  function blocks(markdown) {
    const result=[];
    for(const original of markdown.split(/\r?\n/)) {
      if(!original.trim())continue;
      const trimmed=original.trim();
      let kind='plain',text=trimmed;
      if(/^\s*>\s+/.test(original)){kind='center';text=trimmed.replace(/^>\s*/,'');}
      else if(/^\s{2,}[-+*]\s+/.test(original)){kind='nested';text=original.replace(/^\s*[-+*]\s+/,'');}
      else if(/^\s*[-+*]\s+/.test(original)){kind='item';text=original.replace(/^\s*[-+*]\s+/,'');}
      else if(/^\s{2,}/.test(original)||/^\*[^*]+\*$/.test(trimmed)){kind='note';text=trimmed;}
      else if(/^#{1,4}\s+/.test(trimmed)){kind='center';text=trimmed.replace(/^#{1,4}\s+/,'');}
      text=text.trim().replace(/<\/?(?:p|em|strong|small)>/g,'');
      if(text)result.push({kind,fragments:inlines(text)});
    }
    return result;
  }

  function splitHugeWord(word,style,max,size) {
    const result=[];let rest=word;
    while(rest) {
      let cut=1;
      while(cut<rest.length&&width(rest.slice(0,cut+1),size,style.italic,style.bold)<=max)cut++;
      result.push(rest.slice(0,cut));rest=rest.slice(cut);
    }
    return result;
  }

  function wrapped(fragments,max,font) {
    const lines=[];let line=[],used=0;
    function flush(){if(line.length)lines.push(line);line=[];used=0;}
    for(const fragment of fragments) {
      const size=font*(fragment.small?.78:1);
      for(const chunk of fragment.text.match(/\S+|\s+/g)||[]) {
        if(!chunk.trim()&&!line.length)continue;
        const options=width(chunk,size,fragment.italic,fragment.bold)>max
          ?splitHugeWord(chunk,fragment,max,size):[chunk];
        for(const token of options){
          const w=width(token,size,fragment.italic,fragment.bold);
          if(line.length&&used+w>max){flush();if(!token.trim())continue;}
          if(!line.length&&!token.trim())continue;
          line.push({text:token,size,italic:fragment.italic,bold:fragment.bold});used+=w;
        }
      }
    }
    flush();return lines.length?lines:[[]];
  }

  function layout(source,font,centered) {
    let height=0;
    const result=source.map(block=>{
      const minor=block.kind==='nested'||block.kind==='note';
      const base=font*(minor?.78:1),lineHeight=base*1.35;
      const max=centered||block.kind==='center'?635:minor?555:606;
      const lines=wrapped(block.fragments,max,base);
      const gap=block.kind==='item'?font*.18:font*.07;
      height+=lines.length*lineHeight+gap;
      return {...block,lines,base,lineHeight,gap};
    });
    return {entries:result,height};
  }

  function textLine(parts,x,y,centered) {
    let tag='<text x="'+x+'" y="'+y.toFixed(2)+'" fill="black" font-family="Arial,sans-serif"';
    if(centered)tag+=' text-anchor="middle"';
    tag+='>';
    for(const span of parts) {
      tag+='<tspan font-size="'+span.size.toFixed(2)+'"';
      if(span.italic)tag+=' font-style="italic"';
      if(span.bold)tag+=' font-weight="bold"';
      tag+='>'+xml(span.text)+'</tspan>';
    }
    return tag+'</text>';
  }

  window.GARAGE_answerSrc=function(card) {
    if(!card)return '';
    const markdown=String(card.composition||card.answerText||'').trim();
    if(card.compositionNeedsReview&&!card.compositionEdited&&card.back)return card.back;
    if(!markdown)return card.back||'';
    const items=blocks(markdown);
    if(!items.length)return card.back||'';
    // Layout is inferred from the text itself: no per-card layout controls.
    // A line prefixed with > is centered, nested lists and italics are smaller.
    const center=items.every(item=>item.kind==='plain'||item.kind==='center');
    const titleLines=wrapped([{text:String(card.title||''),small:false,italic:false,bold:true}],638,44);
    const headFont=titleLines.length>1?40:44,headTop=titleLines.length>1?89:95;
    const contentTop=Math.max(160,headTop+(titleLines.length-1)*53+74);
    const room=1081-contentTop;
    let font=43,render=layout(items,font,center);
    while(font>17&&render.height>room){font--;render=layout(items,font,center);}
    let y=center?contentTop+Math.max(0,(room-render.height)/2):contentTop;
    const svg=[];
    titleLines.forEach((line,k)=>svg.push(textLine(line.map(span=>({...span,size:headFont,bold:true})),400,headTop+k*53,true)));
    for(const item of render.entries){
      const centered=center||item.kind==='center';
      const x=centered?400:item.kind==='nested'||item.kind==='note'?166:122;
      if(!centered&&item.kind==='item')
        svg.push('<circle cx="96" cy="'+(y+item.base*.63).toFixed(2)+'" r="6" fill="black"/>');
      else if(!centered&&item.kind==='nested')
        svg.push('<circle cx="144" cy="'+(y+item.base*.63).toFixed(2)+'" r="4.4" fill="white" stroke="black" stroke-width="2.5"/>');
      item.lines.forEach((line,k)=>svg.push(textLine(line,x,y+item.base+item.lineHeight*k,centered)));
      y+=item.lines.length*item.lineHeight+item.gap;
    }
    const result='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">'+svg.join('')+'</svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(result);
  };
})();