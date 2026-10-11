const $=id=>document.getElementById(id);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const P=(t,a,b)=>clamp((t-a)/(b-a));
const eoc=x=>1-Math.pow(1-x,3), eoq=x=>1-Math.pow(1-x,4);
const eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const eob=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const lerp=(a,b,x)=>a+(b-a)*x;
const SHOTS='file:///workspace/demo-work/shots/';

function hexSVG(w,h,s){
  const W=Math.sqrt(3)*s,H=1.5*s;let d='';
  for(let r=-1;r<h/H+1;r++)for(let c=-1;c<w/W+1;c++){
    const cx=c*W+(r%2?W/2:0),cy=r*H;
    const pts=[0,1,2,3,4,5].map(i=>{const a=Math.PI/180*(60*i-30);return [cx+s*Math.cos(a),cy+s*Math.sin(a)]});
    d+='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';
  }
  return `<svg width="${w}" height="${h}"><path d="${d}" fill="none" stroke="#12378F" stroke-opacity="0.055" stroke-width="1.6"/></svg>`;
}
['intro','prob','how','feat','sec','end'].forEach(k=>{$('hex_'+k).innerHTML=hexSVG(2320,1480,64)});

// ---- intro layout
$('i_eye').style.top='312px';
$('i_l1').parentElement.style.top='385px'; $('i_l2').parentElement.style.top='530px'; $('i_acc').style.top='708px';
const S={};
S.intro=t=>{
  $('hex_intro').style.opacity=P(t,0,1.2);
  const lg=$('i_logo'); const a=P(t,.1,1.2), mv=eio(P(t,1.9,2.8));
  const sc=lerp(0.4+0.6*eob(a),0.58,mv), dy=lerp(0,-370,mv);
  lg.style.opacity=P(t,.1,.6); lg.style.transform=`translateY(${dy}px) scale(${lerp(0.4+0.6*eob(a),0.58,mv)/1})`;
  $('i_shadow').style.opacity=P(t,.5,1.2)*(1-mv); $('i_shadow').style.transform=`scale(${.6+.4*eob(a)})`;
  $('i_eye').style.opacity=P(t,4.7,5.3);
  $('i_l1').style.transform=`translateY(${(1-eoq(P(t,2.2,3.0)))*160}px)`;
  $('i_l2').style.transform=`translateY(${(1-eoq(P(t,3.0,3.8)))*160}px)`;
  $('i_acc').style.transform=`scaleX(${eoq(P(t,3.9,4.7))})`;
};

// ---- problem
const dmData=[['Alex · Sponsor','any update on my payment?',3],['Sam · Project','sending it tomorrow, promise','2'],['Jo · Creator','can you resend the link?','4'],['Riley · Project','still waiting on the sheet…','3']];
$('p_dms').innerHTML=dmData.map((d,i)=>`<div class="dm" id="dm${i}" style="left:${150+(i%2)*70}px;top:${230+i*150}px"><div class="av"></div><div style="flex:1"><div style="font-weight:700;font-size:24px">${d[0]}</div><div style="font-size:26px;color:#4A5060;margin-top:4px;font-weight:500">${d[1]}</div></div><div class="bd" style="min-width:42px;height:42px;border-radius:21px;background:#12378F;color:#fff;font-weight:700;font-size:22px;display:flex;align-items:center;justify-content:center;padding:0 10px">${d[2]}</div></div>`).join('');
S.prob=t=>{
  $('hex_prob').style.opacity=1;
  const ex=P(t,9.0,9.8), chaos=1-ex;
  dmData.forEach((d,i)=>{
    const el=$('dm'+i), u=eoq(P(t,.4+.35*i,1.0+.35*i));
    const sh=P(t,2.4,9)*(Math.sin(t*2.1+i*1.7)*1.1);
    el.style.opacity=u*chaos; el.style.transform=`translateX(${(1-u)*-120}px) rotate(${sh}deg) scale(${1-.06*ex})`;
    el.querySelector('.bd').textContent=Math.round(lerp(+d[2]||3,(+d[2]||3)*3,P(t,.6,6)));
  });
  const us=eoq(P(t,2.5,3.2)); const sheet=$('p_sheet');
  sheet.style.opacity=us*chaos; sheet.style.transform=`translateX(${(1-us)*120}px) rotate(${P(t,3.2,9)*Math.sin(t*1.7)*.9}deg) scale(${1-.06*ex})`;
  sheet.querySelectorAll('.q').forEach((q,i)=>{q.style.opacity=.4+.6*Math.abs(Math.sin(t*2.6+i*1.3));q.style.color='#12378F';q.style.fontWeight=800});
  const ush=eob(P(t,4.5,5.3)); const shot=$('p_shot');
  shot.style.opacity=clamp(P(t,4.5,5.0))*chaos; shot.style.transform=`scale(${.8+.2*ush}) rotate(${-4+Math.sin(t*1.5)*.8}deg)`;
  const st=$('p_stamp'); const us2=P(t,6.6,7.0);
  st.style.opacity=us2*chaos; st.style.transform=`rotate(-9deg) scale(${lerp(2.4,1,eoq(us2))})`;
  // solution
  const v=eoq(P(t,9.5,10.4)); const vl=$('p_vault');
  vl.style.opacity=v; vl.style.transform=`translateY(${(1-v)*40}px) scale(${.94+.06*v})`;
  $('p_fill').style.width=(eoq(P(t,10.0,11.4))*100)+'%';
  const c1=eob(P(t,10.5,11.2)), c2=eob(P(t,10.9,11.6));
  $('p_chip').style.opacity=P(t,10.5,10.8); $('p_chip').style.transform=`scale(${c1})`;
  $('p_chip2').style.opacity=P(t,10.9,11.2); $('p_chip2').style.transform=`scale(${c2})`;
};
// center chips under vault
$('p_chip').style.left='590px'; $('p_chip').style.top='745px'; $('p_chip2').style.left='960px'; $('p_chip2').style.top='745px';

// ---- how it works
const hw=[
 {t:'Lock the budget',s:'Sponsor escrows USDC in a vault',at:1.0},
 {t:'Creators submit',s:'One link per creator, onchain',at:4.2},
 {t:'Sponsor approves',s:'Review the clip, one click',at:6.7},
 {t:'Paid & verified',s:'USDC lands instantly, with proof',at:9.3}];
const ill=[
`<svg width="344" height="230" viewBox="0 0 344 230" fill="none"><ellipse cx="172" cy="196" rx="96" ry="11" fill="#12378F" opacity=".10"/><g id="hv"><rect x="102" y="70" width="140" height="116" rx="24" fill="#fff" stroke="#CFDBF3" stroke-width="2"/><circle cx="172" cy="128" r="33" fill="#12378F"/><circle cx="172" cy="128" r="20" stroke="#fff" stroke-width="3" opacity=".9"/><g class="dial" stroke="#fff" stroke-width="4" stroke-linecap="round"><line x1="172" y1="110" x2="172" y2="146"/><line x1="154" y1="128" x2="190" y2="128"/></g><circle cx="172" cy="128" r="6" fill="#fff"/></g><g class="coin"><circle cx="172" cy="40" r="24" fill="#12378F"/><circle cx="172" cy="40" r="17" stroke="#fff" stroke-width="2.5" opacity=".7"/><text x="172" y="49" text-anchor="middle" font-family="InterV" font-weight="800" font-size="23" fill="#fff">$</text></g></svg>`,
`<div style="position:relative;width:344px;height:230px"><div class="lk" style="position:absolute;left:30px;top:30px;width:284px;height:54px;border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(18,55,143,.14);display:flex;align-items:center;gap:12px;padding:0 16px;font-weight:650;font-size:20px"><div style="width:28px;height:28px;border-radius:50%;background:#CFDBF3"></div>x.com/clip_one</div><div class="lk" style="position:absolute;left:30px;top:96px;width:284px;height:54px;border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(18,55,143,.14);display:flex;align-items:center;gap:12px;padding:0 16px;font-weight:650;font-size:20px"><div style="width:28px;height:28px;border-radius:50%;background:#CFDBF3"></div>youtu.be/edit_2</div><div class="lk" style="position:absolute;left:30px;top:162px;width:284px;height:54px;border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(18,55,143,.14);display:flex;align-items:center;gap:12px;padding:0 16px;font-weight:650;font-size:20px"><div style="width:28px;height:28px;border-radius:50%;background:#CFDBF3"></div>tiktok.com/@nova</div></div>`,
`<div style="position:relative;width:344px;height:230px"><div style="position:absolute;left:30px;top:34px;width:284px;height:70px;border-radius:18px;background:#fff;box-shadow:0 8px 20px rgba(18,55,143,.14);display:flex;align-items:center;justify-content:space-between;padding:0 18px"><div style="font-weight:700;font-size:20px">Demo Creator</div><div class="pend" style="font-size:17px;font-weight:700;border-radius:999px;padding:6px 14px;background:#E8EEFA;color:#12378F">Pending</div></div><div class="btn" style="position:absolute;left:92px;top:130px;width:160px;height:56px;border-radius:16px;background:#12378F;color:#fff;font-weight:700;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(18,55,143,.35)">Approve & pay</div><svg class="cur" width="34" height="34" viewBox="0 0 24 24" style="position:absolute;left:230px;top:190px"><path d="M3 2 L3 19.5 L7.6 15.4 L10.6 22 L13.4 20.8 L10.5 14.3 L16.6 14.1 Z" fill="#fff" stroke="#0A0A0A" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`,
`<div style="position:relative;width:344px;height:230px"><div style="position:absolute;left:34px;top:60px;width:76px;height:76px;border-radius:22px;background:#fff;box-shadow:0 8px 20px rgba(18,55,143,.14);display:flex;align-items:center;justify-content:center"><svg width="40" height="42" viewBox="0 0 56 60" fill="none"><rect x="6" y="26" width="44" height="30" rx="9" fill="#12378F"/><path d="M15 26v-8a13 13 0 0 1 26 0v8" stroke="#12378F" stroke-width="6" stroke-linecap="round"/></svg></div><div style="position:absolute;left:236px;top:60px;width:76px;height:76px;border-radius:50%;background:#12378F;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:30px">DC</div><div class="mc" style="position:absolute;left:60px;top:76px;width:44px;height:44px;border-radius:50%;background:#12378F;border:3px solid #fff;color:#fff;font-weight:800;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(18,55,143,.4)">$</div><div class="ex" style="position:absolute;left:62px;top:158px;width:220px;height:50px;border-radius:25px;background:#fff;box-shadow:0 8px 20px rgba(18,55,143,.14);display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:19px"><svg width="22" height="22" style="color:#12378F"><use href="#chk"/></svg>Solana Explorer ↗</div></div>`];
$('w_cards').innerHTML=hw.map((c,i)=>`<div class="card shadow-card hc" id="hc${i}" style="left:${100+i*440}px;top:300px;width:400px;height:480px;border:3px solid transparent"><div class="panel" style="left:28px;top:28px;right:28px;height:230px;display:flex;align-items:center;justify-content:center">${ill[i]}</div><div class="abs" style="left:28px;top:290px;display:flex;align-items:center;gap:16px"><div class="badge">0${i+1}</div><div class="ctitle" style="font-size:34px">${c.t}</div></div><div class="abs csub" style="left:28px;top:372px;width:340px">${c.s}</div></div>`).join('');
S.how=t=>{
  $('hex_how').style.opacity=1;
  $('w_eye').style.opacity=P(t,0,.5); $('w_h').style.opacity=P(t,.1,.7); $('w_h').style.transform=`translateY(${(1-eoq(P(t,.1,.8)))*30}px)`;
  hw.forEach((c,i)=>{
    const el=$('hc'+i), u=eoq(P(t,c.at-.5,c.at+.3));
    const nxt=hw[i+1]?hw[i+1].at:13.6;
    const act=P(t,c.at,c.at+.35)*(1-P(t,nxt-.1,nxt+.3));
    el.style.opacity=u; el.style.transform=`translateY(${(1-u)*70}px) scale(${1+.035*act})`;
    el.style.borderColor=`rgba(18,55,143,${act})`;
    el.style.boxShadow=`0 1px 2px rgba(10,10,10,.04),0 14px 34px rgba(10,10,10,.07),0 ${36+20*act}px ${80+30*act}px rgba(18,55,143,${.08+.12*act})`;
    const lt=Math.max(0,t-c.at);
    if(i==0){ const e=el; const coin=e.querySelector('.coin'); const dr=eio(P(lt,.1,1.4)); coin.setAttribute('transform',`translate(0 ${dr*66})`); coin.style.opacity=1-P(lt,1.2,1.5); e.querySelector('.dial').setAttribute('transform',`rotate(${P(lt,1.2,2.4)*360} 172 128)`); }
    if(i==1){ el.querySelectorAll('.lk').forEach((k,j)=>{const a=eoq(P(lt,.1+.5*j,.7+.5*j)); k.style.opacity=a; k.style.transform=`translateX(${(1-a)*80}px)`;}); }
    if(i==2){ const press=P(lt,1.0,1.2)*(1-P(lt,1.2,1.4)); const b=el.querySelector('.btn'); b.style.transform=`scale(${1-.07*press})`; const cur=el.querySelector('.cur'); const mv=eio(P(lt,.1,1.0)); cur.style.transform=`translate(${lerp(60,-96,mv)}px,${lerp(36,-26,mv)}px)`; const pe=el.querySelector('.pend'); const ok=P(lt,1.3,1.6); pe.textContent=ok>.5?'Approved':'Pending'; pe.style.background=ok>.5?'#12378F':'#E8EEFA'; pe.style.color=ok>.5?'#fff':'#12378F'; }
    if(i==3){ const mv=eio(P(lt,.2,1.6)); const mc=el.querySelector('.mc'); mc.style.transform=`translateX(${mv*206}px) scale(${1+.2*Math.sin(mv*Math.PI)})`; mc.style.opacity=1-P(lt,1.6,1.9)*.0; const ex=eob(P(lt,1.7,2.3)); const e2=el.querySelector('.ex'); e2.style.transform=`scale(${ex})`; e2.style.opacity=P(lt,1.7,2.0); }
  });
  $('w_line').style.width=(eio(P(t,.8,13))*1620)+'px'; $('w_line').style.opacity=.9;
};

// ---- features
const win=(id,img,url,x,y,w,imgH)=>`<div class="win" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="bar"><i></i><i></i><i></i><span>${url}</span></div><img src="${SHOTS}${img}"></div>`;
const phone=(id,img,x,y,w,h)=>`<div class="phone" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="notch"></div><div class="scr"><img src="${SHOTS}${img}"></div></div>`;
const icoX='<svg width="26" height="26" viewBox="0 0 24 24"><path fill="#0A0A0A" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
const icoGh='<svg width="26" height="26" viewBox="0 0 24 24"><path fill="#0A0A0A" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>';
const icoDc='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5865F2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5c1.7-.9 3.5-1.3 5.5-1.3s3.8.4 5.5 1.3c1.7 2.6 2.6 5.3 2.7 8.5-1.3 1-2.8 1.7-4.4 2.1l-1-1.7M6.5 6.5C4.8 9.1 3.9 11.8 3.8 15c1.3 1 2.8 1.7 4.4 2.1l1-1.7"/><path d="M8 15.2c2.6.9 5.4.9 8 0"/><circle cx="9.2" cy="11.3" r="1" fill="#5865F2"/><circle cx="14.8" cy="11.3" r="1" fill="#5865F2"/></svg>';
$('f_root').innerHTML=
 win('fw1','leaderboard.png','munera-opal.vercel.app/leaderboard',150,150,1250)+
 `<div class="lab" id="fl1" style="left:1090px;top:775px"><svg width="30" height="30" style="color:#fff"><use href="#chk"/></svg>Creator leaderboard</div>`+
 `<div class="chip" id="fc1a" style="left:1240px;top:260px"><span style="width:40px;height:40px;border-radius:12px;background:#12378F;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">1</span>Demo Creator<b style="color:#12378F">10.00 USDC</b></div>`+
 `<div class="chip" id="fc1b" style="left:1300px;top:350px;font-size:23px;color:#4A5060">Ranked by USDC earned, onchain</div>`+
 win('fw2','profile.png','munera-opal.vercel.app/creator/HbgL…u22Kv',520,150,1250)+
 `<div class="lab" id="fl2" style="left:200px;top:780px">Creator profiles & socials</div>`+
 `<div class="chip" id="fc2a" style="left:150px;top:300px">${icoX}@munera_xyz</div><div class="chip" id="fc2b" style="left:110px;top:400px">${icoDc}Discord</div><div class="chip" id="fc2c" style="left:170px;top:500px">${icoGh}GitHub</div>`+
 `<div class="chip" id="fc2d" style="left:1330px;top:790px;font-size:23px;color:#4A5060">Self-declared · stored onchain via Memo</div>`+
 win('fw3','dashboard.png','munera-opal.vercel.app/dashboard',90,200,1050)+
 phone('fp1','m_home.png',1230,120,330,700)+phone('fp2','m_bounty.png',1580,220,330,700)+
 `<div class="lab" id="fl3a" style="left:140px;top:850px">Sponsor & creator dashboards</div><div class="lab" id="fl3b" style="left:1260px;top:60px;background:#0A0A0A;box-shadow:0 14px 34px rgba(10,10,10,.3)">Mobile first</div>`+
 win('fw4','docs.png','munera-opal.vercel.app/docs',330,150,1260)+
 `<div class="lab" id="fl4" style="left:330px;top:800px">Full documentation</div><div class="chip" id="fc4a" style="left:1280px;top:250px">Quickstart</div><div class="chip" id="fc4b" style="left:1380px;top:340px">Concepts</div><div class="chip" id="fc4c" style="left:1230px;top:430px">Contract reference</div>`;
const fsub=[[0.0,3.7],[3.5,7.4],[7.2,11.0],[10.8,15.2]];
function fx(id,t,k,dx0,dx1,delay=0,rot=0,scl=1){
  const [s,e]=fsub[k]; const el=$(id); if(!el) return;
  const i=eoq(P(t,s+delay,s+delay+.7)), o=eio(P(t,e-.55,e));
  const first=k==0&&t<1; 
  el.style.opacity=k==0?i*(1-o):i*(1-o);
  el.style.transform=`translateX(${(1-i)*dx0+o*dx1}px) rotate(${rot}deg) scale(${scl*(.96+.04*i)})`;
}
S.feat=t=>{
  $('hex_feat').style.opacity=1;
  fx('fw1',t,0,160,-160,0,0); fx('fl1',t,0,-80,-80,.5); fx('fc1a',t,0,120,-120,.8); fx('fc1b',t,0,120,-120,1.1);
  fx('fw2',t,1,160,-160,0); fx('fl2',t,1,-80,-80,.5); fx('fc2a',t,1,-100,-120,.7); fx('fc2b',t,1,-100,-120,1.0); fx('fc2c',t,1,-100,-120,1.3); fx('fc2d',t,1,100,-120,1.5);
  fx('fw3',t,2,-160,-160,0,-1.5); fx('fp1',t,2,160,-160,.3); fx('fp2',t,2,200,-160,.5); fx('fl3a',t,2,-80,-80,.6); fx('fl3b',t,2,80,-80,.9);
  fx('fw4',t,3,160,160,0); fx('fl4',t,3,-80,80,.5); fx('fc4a',t,3,100,100,.8); fx('fc4b',t,3,100,100,1.1); fx('fc4c',t,3,100,100,1.4);
  // gentle drift
  ['fw1','fw2','fw3','fw4'].forEach((id,i)=>{});
};

// ---- security
const secData=[
 {t:'Anchor program',p:'Rust escrow program, live on devnet',m:'48KEXp…h4S3W',at:.5,ic:'<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#12378F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M5 12H2c0 5 4.5 9 10 9s10-4 10-9h-3M8 12h8"/></svg>'},
 {t:'PDA-owned vault',p:'The vault token account is owned by the Bounty PDA',m:'seeds: ["bounty", sponsor, id]',at:1.4,ic:'<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#12378F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="#12378F"/></svg>'},
 {t:'Checked math',p:'Every add and multiply is overflow-checked',m:'budget = reward × winners',at:5.0,ic:'<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#12378F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>'},
 {t:'Sponsor-only actions',p:'Sponsor-only approve, reject, reclaim. No double payment.',m:'one payout per submission',at:5.7,ic:'<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#12378F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>'},
 {t:'tests passing',p:'Lifecycle, access control and edge cases',m:'anchor test',at:8.9,big:true,ic:''},
 {t:'No backend',p:'No server or database. Reads onchain accounts.',m:'Next.js + Solana RPC only',at:10.1,ic:'<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#12378F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M3 3l18 18"/></svg>'}];
$('y_eye').style.top='64px'; $('y_h').style.top='104px';
$('y_cards').innerHTML=secData.map((c,i)=>`<div class="sec" id="yc${i}" style="left:${120+(i%3)*580}px;top:${i<3?230:580}px;width:540px;height:320px"><div class="tag" id="yt${i}"><svg width="26" height="26" style="color:#fff"><use href="#chk"/></svg></div>${c.big?`<div style="display:flex;align-items:baseline;gap:14px"><span id="ytest" style="font-weight:800;font-size:104px;letter-spacing:-0.04em;line-height:1;color:#12378F">0</span><span style="font-size:34px;font-weight:700">tests passing</span></div><p style="margin-top:22px">${c.p}</p>`:`<div class="ic">${c.ic}</div><h3>${c.t}</h3><p>${c.p}</p>`}<div class="mono" style="position:absolute;left:40px;bottom:24px;font-size:20px;color:#12378F;font-weight:600">${c.m}</div></div>`).join('');
S.sec=t=>{
  $('hex_sec').style.opacity=1;
  $('y_eye').style.opacity=P(t,0,.4); $('y_h').style.opacity=P(t,0,.6); $('y_h').style.transform=`translateY(${(1-eoq(P(t,0,.7)))*24}px)`;
  secData.forEach((c,i)=>{
    const el=$('yc'+i), u=eoq(P(t,c.at-.1,c.at+.6));
    el.style.opacity=u; el.style.transform=`translateY(${(1-u)*60}px) scale(${.96+.04*u})`;
    const tg=eob(P(t,c.at+.7,c.at+1.2)); $('yt'+i).style.transform=`scale(${tg})`; $('yt'+i).style.opacity=P(t,c.at+.7,c.at+.9);
  });
  $('ytest').textContent=Math.round(22*eio(P(t,8.9,10.2)));
};

// ---- end
function centerPills(){const a=$('e_u1'),b=$('e_u2'),c=$('e_u3');const gap=36,w=a.offsetWidth+b.offsetWidth+gap;a.style.left=(960-w/2)+'px';b.style.left=(960-w/2+a.offsetWidth+gap)+'px';c.style.left=(960-c.offsetWidth/2)+'px';}
S.end=t=>{
  centerPills();
  $('hex_end').style.opacity=P(t,0,1);
  const a=P(t,.1,1.1);
  $('e_logo').style.opacity=P(t,.1,.5); $('e_logo').style.transform=`scale(${.4+.6*eob(a)})`;
  $('e_shadow').style.opacity=P(t,.5,1.1); $('e_shadow').style.transform=`scale(${.6+.4*eob(a)})`;
  const w=P(t,.9,1.7); $('e_word').style.opacity=w; $('e_word').style.letterSpacing=(lerp(.7,.3,eoq(w)))+'em'; $('e_word').style.transform=`translateY(${(1-eoq(w))*20}px)`;
  $('e_under').style.transform=`scaleX(${eoq(P(t,1.4,2.1))})`;
  $('e_tag').style.opacity=P(t,1.9,2.5); $('e_tag').style.transform=`translateY(${(1-eoq(P(t,1.9,2.6)))*16}px)`;
  [['e_u1',3.0],['e_u2',3.3],['e_u3',3.6]].forEach(([id,s])=>{const u=eoq(P(t,s,s+.6));$(id).style.opacity=u;$(id).style.transform=`translateY(${(1-u)*30}px)`;});
};

window.render=(scene,t,cues)=>{
  document.querySelectorAll('.scene').forEach(e=>e.style.display='none');
  $('s_'+scene).style.display='block';
  S[scene](t);
  window.ovRender(t,cues||{});
};
window.ready=Promise.all([document.fonts.load('700 40px InterV'),document.fonts.ready,...[...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=r;i.onerror=r}))]);
