// Deterministic overlay renderer (captions, section lower-third, stat callouts). window.ovRender(t, cues)
(function(){
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const eoc=x=>1-Math.pow(1-x,3), eoq=x=>1-Math.pow(1-x,4), eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  const $=id=>document.getElementById(id);
  window.OV_IN=0.5; window.OV_OUT=0.4;
  function envelope(t,s,e){ // 0..1 in/out
    return Math.min(clamp((t-s)/OV_IN), clamp((e-t)/OV_OUT));
  }
  window.ovRender=function(t,cues){
    // caption
    let cap=null;
    for(const c of (cues.caps||[])) if(t>=c.s && t<=c.e) cap=c;
    const cEl=$('cap');
    if(cap){
      const k=envelope(t,cap.s,cap.e); const ke=eoc(k);
      if($('captxt').textContent!==cap.text) $('captxt').textContent=cap.text;
      cEl.style.opacity=ke; cEl.style.transform=`translateY(${(1-ke)*26}px)`;
    } else { cEl.style.opacity=0; }
    // title
    let ti=null; for(const c of (cues.titles||[])) if(t>=c.s && t<=c.e) ti=c;
    const tEl=$('ttl');
    if(ti){
      const k=envelope(t,ti.s,ti.e), ke=eoq(k);
      $('ttlnum').textContent='Step '+ti.num; $('ttltxt').textContent=ti.text;
      tEl.style.opacity=ke; tEl.style.transform=`translateX(${(1-ke)*-70}px)`;
    } else tEl.style.opacity=0;
    // stat
    let st=null; for(const c of (cues.stats||[])) if(t>=c.s && t<=c.e) st=c;
    const sEl=$('stat');
    if(st){
      const k=envelope(t,st.s,st.e), ke=eoq(k);
      const u=eio(clamp((t-st.s-0.35)/st.dur));
      const v=st.from+(st.to-st.from)*u;
      $('statlab').textContent=st.label;
      $('statval').innerHTML=v.toFixed(2)+'<small>'+st.unit+'</small>';
      $('statsub').textContent=st.sub||'';
      const mx=Math.max(st.from,st.to)||1;
      $('statbar').firstElementChild.style.width=(v/mx*100).toFixed(1)+'%';
      sEl.style.opacity=ke; sEl.style.transform=`translateX(${(1-ke)*70}px)`;
    } else sEl.style.opacity=0;
  };
  // is anything animating at t? (for frame de-duplication) -> returns a static key or null
  window.ovKey=function(t,cues){
    const parts=[]; let anim=false;
    const chk=(arr,tag,extra)=>{ (arr||[]).forEach((c,i)=>{ if(t>=c.s&&t<=c.e){ parts.push(tag+i); if(t<c.s+OV_IN||t>c.e-OV_OUT) anim=true; if(extra&&t<c.s+0.35+c.dur+0.05) anim=true; } }); };
    chk(cues.caps,'c'); chk(cues.titles,'t'); chk(cues.stats,'s',true);
    return anim?null:parts.join('|');
  };
})();
