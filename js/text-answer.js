(function(){
  function esc(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  window.GARAGE_answerSrc=function(c){
    if(!c) return '';
    const txt=(c.answerText||'').trim();
    if(!txt) return c.back||'';
    const lines=[];
    for(const para of txt.split(/\\r?\\n/)){
      let row='';
      for(const word of para.split(/\\s+/)){
        if(row && (row+' '+word).length>34){lines.push(row);row=word;} else row+=(row?' ':'')+word;
      }
      if(row) lines.push(row);
    }
    const font=Math.max(22,Math.min(36,Math.floor(710/Math.max(lines.length,1))));
    const lineH=font*1.6;
    const start=Math.max(80,(960-lines.length*lineH)/2);
    const t=lines.slice(0,35).map((l,k)=>'<text x="60" y="'+(start+k*lineH)+'" fill="white" font-size="'+font+'" font-family="Arial, sans-serif">'+esc(l)+'</text>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" rx="20" fill="#151515"/><text x="60" y="60" fill="#ff4d4d" font-family="Arial" font-size="30" font-weight="bold">'+esc(c.title||'Состав')+'</text>'+t+'</svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  };
})();
