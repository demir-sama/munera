#!/usr/bin/env python3
"""Build Munera demo audio v2: voice (edge-tts Andrew Multilingual), SFX (Kenney CC0 + synthesized), full mix, pack.
Usage: build_audio.py voice|sfx|mix  (run in order; each stage writes into /workspace/munera-demo-audio)"""
import json, os, sys, subprocess, csv, wave, random, glob, shutil
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy import signal
OUT='/workspace/munera-demo-audio'; WORK='/workspace/demo-work'; SR=48000
os.chdir(OUT)
VD=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','/workspace/munera/assets/munera-demo.mp4']).decode())
LINES=json.load(open('/workspace/munera/app/scripts/demo/lines.json')); TEXT={l['id']:l['text'] for l in LINES}
CUES=json.load(open(f'{WORK}/cues_global.json'))
TARGET=-19.0  # mono-measured; dual-mono stereo file reads as -16 LUFS (ebur128 sums channels)
def rd(p):
    x,sr=sf.read(p,dtype='float32'); 
    if x.ndim>1: x=x.mean(1)
    if sr!=SR: x=signal.resample_poly(x,SR,sr)
    return x
def fade(x,ms=8):
    n=int(SR*ms/1000); x=x.copy(); r=np.linspace(0,1,n); x[:n]*=r; x[-n:]*=r[::-1]; return x
def place(buf,x,t,g=1.0):
    i=int(t*SR); 
    if i<0: x=x[-i:]; i=0
    j=min(len(buf),i+len(x)); 
    if j>i: buf[i:j]+=x[:j-i]*g
def limit(x,lim=0.84):
    sf.write('/tmp/lim_in.wav',np.pad(x,(0,int(0.05*SR))),SR,subtype='FLOAT')
    subprocess.run(['ffmpeg','-y','-v','error','-i','/tmp/lim_in.wav','-af',f'alimiter=limit={lim}:attack=2:release=40:level=0','-c:a','pcm_f32le','/tmp/lim_out.wav'],check=True)
    y,_=sf.read('/tmp/lim_out.wav',dtype='float32'); return y[:len(x)]
def db(x): return 20*np.log10(max(x,1e-9))

def stage_voice():
    meter=pyln.Meter(SR); sched=[]; prev_end=0.0
    os.makedirs('lines',exist_ok=True); [os.remove(f) for f in glob.glob('lines/*.wav')]
    clips={}
    for k,c in enumerate(CUES):
        i=c['id']; x=rd(f'clean/{i}.wav'); d=len(x)/SR
        start=max(c['g']-0.12, prev_end+0.18)
        nxt=CUES[k+1]['g'] if k+1<len(CUES) else VD-0.3
        avail=nxt+0.45-0.18-start
        f=min(1.12,max(1.0,d/avail))
        if f>1.005:
            tmp=f'/tmp/tempo_{i}.wav'; subprocess.run(['ffmpeg','-y','-v','error','-i',f'clean/{i}.wav','-af',f'atempo={f:.4f}',tmp],check=True); x=rd(tmp); d=len(x)/SR
        # per-line loudness to -16 LUFS (short lines: use peak-ish fallback)
        try:
            l=meter.integrated_loudness(np.pad(x,(int(SR*0.2),int(SR*0.2)))); x=x*10**((TARGET-l)/20)
        except Exception: pass
        x=limit(fade(x))
        sched.append(dict(id=i,start=start,dur=d,cue=c['g'],tempo=round(f,3))); prev_end=start+d; clips[i]=x
    maxdelay=max(s['start']-s['cue'] for s in sched)
    track=np.zeros(int(VD*SR))
    for s in sched: place(track,clips[s['id']],s['start'])
    # overall to -16 LUFS integrated, limiter
    l=pyln.Meter(SR).integrated_loudness(track); gg=10**((TARGET-l)/20)
    for k in clips: clips[k]=limit(clips[k]*gg)
    track=np.zeros(int(VD*SR))
    for s in sched: place(track,clips[s['id']],s['start'])
    l2=pyln.Meter(SR).integrated_loudness(track)
    sf.write('munera-voiceover-v2.wav',np.stack([track,track],1),SR,subtype='PCM_16')
    subprocess.run(['ffmpeg','-y','-v','error','-i','munera-voiceover-v2.wav','-b:a','192k','munera-voiceover-v2.mp3'],check=True)
    g=1.0
    with open('lines.csv','w',newline='') as fh:
        w=csv.writer(fh); w.writerow(['file','start_s','end_s','id','text'])
        for n,s in enumerate(sched,1):
            fn=f"lines/{n:02d}-{s['id']}.wav"; x=clips[s['id']]*g
            x=np.clip(x,-0.99,0.99); sf.write(fn,np.stack([x,x],1),SR,subtype='PCM_16')
            w.writerow([fn,f"{s['start']:.2f}",f"{s['start']+s['dur']:.2f}",s['id'],TEXT[s['id']]])
    json.dump(sched,open('voice_schedule.json','w'),indent=1)
    print('voice LUFS pre',round(l,1),'post-limit',round(l2,2),'max start delay',round(maxdelay,2),'tempos>1:',[(s['id'],s['tempo']) for s in sched if s['tempo']>1.0])
    print('peak dBFS',round(db(np.abs(track).max()),1))


# ---------------- SFX ----------------
K='/workspace/munera-demo-audio/src/'
KEN={ # name -> (source file, description)
 'click':(K+'ui-audio/Audio/click2.ogg','UI mouse click'),
 'tick1':(K+'interface-sounds/Audio/tick_001.ogg','keyboard-style tick (a)'),
 'tick2':(K+'interface-sounds/Audio/tick_002.ogg','keyboard-style tick (b)'),
 'tick3':(K+'interface-sounds/Audio/tick_004.ogg','keyboard-style tick (c)'),
 'pop1':(K+'interface-sounds/Audio/maximize_003.ogg','soft pop (lower-third / card in)'),
 'pop2':(K+'interface-sounds/Audio/select_003.ogg','soft select pop (stat callout)'),
 'pop3':(K+'interface-sounds/Audio/pluck_001.ogg','pluck pop (DM / chip)'),
 'ding':(K+'interface-sounds/Audio/confirmation_002.ogg','success ding (toast)'),
 'toggle':(K+'interface-sounds/Audio/toggle_002.ogg','check tick'),
 'open':(K+'interface-sounds/Audio/open_002.ogg','open / page load'),
 'drop':(K+'interface-sounds/Audio/drop_002.ogg','coin drop'),
 'thunk':(K+'impact-sounds/Audio/impactPlate_heavy_001.ogg','vault lock thunk (source; processed on use)'),
 'slam':(K+'impact-sounds/Audio/impactMetal_medium_002.ogg','stamp slam'),
}
def lp(x,fc,order=4): b,a=signal.butter(order,fc/(SR/2),'low'); return signal.lfilter(b,a,x)
def hp(x,fc,order=2): b,a=signal.butter(order,fc/(SR/2),'high'); return signal.lfilter(b,a,x)
def norm(x,pk=0.7): return x/np.abs(x).max()*pk
def env_ad(n,a,r):
    e=np.ones(n); na=int(a*SR); nr=int(r*SR); e[:na]=np.linspace(0,1,na); e[-nr:]=np.minimum(e[-nr:],np.linspace(1,0,nr)); return e
def sweep_noise(dur,f0,f1,q=0.6,seed=1):
    rng=np.random.default_rng(seed); n=int(dur*SR); x=rng.standard_normal(n)
    fc=np.geomspace(f0,f1,n); y=np.zeros(n); lo=bp=0.0
    for i in range(n): # state-variable bandpass with sweeping centre
        f=2*np.sin(np.pi*min(fc[i],SR/6)/SR); lo+=f*bp; hi=x[i]-lo-q*bp; bp+=f*hi; y[i]=bp
    return y
def whoosh(dur,f0,f1,seed=1): y=sweep_noise(dur,f0,f1,0.5,seed); t=np.linspace(0,1,len(y)); e=np.sin(np.pi*t)**1.6; return norm(y*e)
def riser(dur):
    n=int(dur*SR); t=np.arange(n)/SR; y=sweep_noise(dur,300,5000,0.7,7)*np.linspace(0.05,1,n)**2
    ph=2*np.pi*np.cumsum(np.geomspace(220,880,n))/SR; y=norm(y)*0.6+0.4*np.sin(ph)*np.linspace(0,1,n)**2
    return norm(y*env_ad(n,0.05,0.12))
def bell(f,dur,dec):
    t=np.arange(int(dur*SR))/SR; return (np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*2.76*f*t)*np.exp(-t*dec*1.5)+0.2*np.sin(2*np.pi*4.1*f*t)*np.exp(-t*dec*2))*np.exp(-t*dec)
def kaching():
    n=int(1.6*SR); y=np.zeros(n); rng=np.random.default_rng(3)
    cl=hp(rng.standard_normal(int(0.012*SR)),3000)*np.hanning(int(0.012*SR)); y[:len(cl)]+=cl*0.5
    for f,t0,g in [(1046.5,0.03,0.8),(1318.5,0.11,0.85),(1568,0.19,0.9),(2093,0.29,1.0)]:
        b=bell(f,1.2,3.2)*g; i=int(t0*SR); y[i:i+len(b)]+=b[:n-i]
    return norm(y)
def endchime():
    n=int(2.2*SR); y=np.zeros(n)
    for f,t0,g in [(523.25,0,0.8),(783.99,0.12,0.7),(1046.5,0.24,0.6)]:
        b=bell(f,2.0,2.0)*g; i=int(t0*SR); y[i:i+len(b)]+=b[:n-i]
    return norm(y)
def thunk(x):
    x=lp(x[:int(0.45*SR)],1100); t=np.arange(int(0.3*SR))/SR; th=np.sin(2*np.pi*(70-30*t)*t)*np.exp(-t*14)
    y=np.zeros(max(len(x),len(th))); y[:len(x)]+=norm(x)*0.7; y[:len(th)]+=th*0.8; return norm(y)

def make_sfx_files():
    os.makedirs('sfx',exist_ok=True); [os.remove(f) for f in glob.glob('sfx/*.wav')]
    lib={}; desc={}
    for k,(p,d) in KEN.items():
        x=rd(p); x=norm(x,0.8)
        if k=='thunk': x=thunk(rd(p))
        lib[k]=x; desc[k]=d+(' — Kenney.nl CC0' if k!='thunk' else ' — Kenney.nl CC0, lowpassed + synthesized sub thud')
    synth={'whoosh_soft':(whoosh(0.7,300,2500,1),'soft whoosh (scene crossfade)'),
           'whoosh_short':(whoosh(0.35,500,3500,2),'short whoosh (card / lower-third in)'),
           'swish_zoom':(whoosh(0.5,800,1800,3),'faint swish (zoom)'),
           'riser':(riser(1.5),'soft riser'),
           'kaching':(kaching(),'payout chime / ka-ching (rising bell arpeggio)'),
           'endchime':(endchime(),'soft bell chord (end card)')}
    for k,(x,d) in synth.items(): lib[k]=x; desc[k]=d+' — synthesized (numpy), CC0 / no rights reserved'
    for k,x in lib.items(): sf.write(f'sfx/{k}.wav',x,SR,subtype='PCM_16')
    return lib,desc

def scene_info():
    order=['intro','prob','how','live_a','live_b','live_c','live_d','feat','sec','end']
    d=[json.load(open(f'{WORK}/scenes/{n}.json'))['dur'] for n in order]
    starts=[0.0]; L=d[0]
    for k in range(1,len(d)): starts.append(L-0.3); L=L-0.3+d[k]
    return dict(zip(order,starts)),dict(zip(order,d))
def live_map(s):
    m=json.load(open(f'{WORK}/live/{s}/manifest.json')); tb=m['tBegin']; cuts=[(a-tb,b-tb) for a,b in m['cuts']]
    xc=f'{WORK}/live/{s}/extracuts.json'
    allc=sorted(cuts+([tuple(x) for x in json.load(open(xc))] if os.path.exists(xc) else []))
    def out(raw): return raw-sum(max(0,min(raw,b)-a) for a,b in allc)
    ev=[(e['type'],(e.get('t',e.get('t0',0))-tb)) for e in m['events']]
    return out,ev,cuts

def stage_sfx():
    lib,desc=make_sfx_files(); starts,durs=scene_info(); cues=[]  # (time, file, gain_dB_peak_dBFS, description)
    def add(t,f,pk,dsc,pitch=1.0): cues.append((round(t,3),f,pk,dsc,pitch))
    rnd=random.Random(5)
    S=starts
    for k,(n,t) in enumerate(S.items()):
        if k>0: add(t-0.15,'whoosh_soft',-31,'scene crossfade whoosh')
    # intro
    t0=S['intro']; add(t0+0.0,'riser',-32,'intro soft riser'); add(t0+1.1,'pop1',-25,'logo lands'); add(t0+1.9,'whoosh_short',-31,'logo moves up'); add(t0+2.3,'pop2',-27,'headline line 1'); add(t0+3.1,'pop2',-27,'headline line 2',1.12); add(t0+3.9,'swish_zoom',-33,'accent line draws')
    # problem
    t0=S['prob']
    for i in range(4): add(t0+0.55+0.35*i,'pop3',-27,f'DM card {i+1}',1+0.05*i)
    add(t0+2.45,'whoosh_short',-31,'spreadsheet slides in'); add(t0+2.8,'pop3',-28,'spreadsheet lands',0.9); add(t0+4.6,'pop1',-27,'screenshot card'); add(t0+6.9,'slam',-21,'NO PROOF stamp slam')
    add(t0+8.95,'whoosh_soft',-31,'chaos clears'); add(t0+9.75,'thunk',-23,'escrow vault locks'); add(t0+10.0,'riser',-34,'vault fills'); add(t0+10.65,'toggle',-26,'chip 1'); add(t0+11.05,'toggle',-26,'chip 2',1.1)
    # how
    t0=S['how']; add(t0+0.1,'pop1',-28,'title in')
    for i,at in enumerate([1.0,4.2,6.7,9.3]):
        add(t0+at-0.45,'whoosh_short',-32,f'step {i+1} card in'); add(t0+at-0.15,'pop1',-26,f'step {i+1} lands',1+0.03*i)
    add(t0+1.6,'drop',-27,'coin drops into vault'); add(t0+2.4,'thunk',-27,'vault dial locks')
    for j,lt in enumerate([0.4,0.9,1.4]): add(t0+4.2+lt,'tick%d'%(j+1),-29,f'submission link {j+1}')
    add(t0+6.7+1.1,'click',-25,'approve button pressed'); add(t0+6.7+1.45,'toggle',-25,'status flips to approved')
    add(t0+9.3+0.8,'whoosh_short',-33,'coin travels'); add(t0+9.3+1.8,'ding',-25,'paid + verified chip')
    # live scenes
    for s,key in [('a','live_a'),('b','live_b'),('c','live_c'),('d','live_d')]:
        out,ev,cuts=live_map(s); G=S[key]
        def g(raw): return G+out(raw)
        for ty,t in ev:
            if ty=='title': add(g(t)-0.2,'whoosh_short',-31,f'section {s}: lower-third in'); add(g(t)+0.05,'pop1',-25,f'section {s}: lower-third pop')
            if ty=='stat': add(g(t),'pop2',-25,f'section {s}: stat callout'); 
        zooms=[t for ty,t in ev if ty=='zoom']
        for z in zooms: add(g(z)-0.05,'swish_zoom',-34,f'section {s}: zoom in')
        stats=[t for ty,t in ev if ty=='stat']
        for t in stats: [add(g(t)+0.35+0.12*i+0.02*i*i*0,'tick%d'%(1+i%3),-31,f'section {s}: stat count tick',1.0+0.04*i) for i in range(10)]
        if s=='a':
            c4=[t for ty,t in ev if ty=='cap'][1]
            add(g(c4-0.9),'click',-25,'click Create in navbar')
            def typing(t0,n,dt,desc): [add(g(t0+i*dt),'tick%d'%(1+rnd.randint(0,2)),-31,desc,rnd.uniform(0.93,1.08)) for i in range(n)]
            typing(c4+1.0,15,0.09,'typing title'); typing(c4+3.4,98,0.034,'typing description'); typing(c4+7.6,1,0,'typing reward'); typing(c4+9.0,1,0,'typing winners')
            add(g(c4+10.1),'click',-26,'deadline field')
            cs,ce=cuts[0]; add(g(cs-1.1),'click',-24,'click Lock funds & create bounty'); add(g(cs-0.95),'thunk',-21,'vault lock thunk'); add(g(ce)+0.1,'ding',-24,'toast: bounty created')
        if s=='b':
            cs,ce=cuts[0]; add(g(4.3),'click',-25,'open bounty card'); 
            [add(g(9.2+i*0.08),'tick%d'%(1+rnd.randint(0,2)),-31,'typing link',rnd.uniform(0.93,1.08)) for i in range(24)]
            add(g(cs-1.1),'click',-24,'click Submit entry'); add(g(ce)+0.1,'ding',-24,'toast: entry submitted')
        if s=='c':
            cs,ce=cuts[0]; add(g(cs-1.1),'click',-24,'click Approve & pay'); add(g(ce)-0.03,'kaching',-18,'PAYOUT: ka-ching'); add(g(ce)+0.4,'ding',-26,'toast: submission approved')
        if s=='d':
            cs,ce=cuts[0]; add(g(cs-0.92),'click',-25,'click payout Tx link'); add(g(ce)+0.1,'open',-27,'Solana Explorer loads')
            st=[t for ty,t in ev if ty=='stat']; add(g(st[1]-1.2),'click',-26,'click Tokens tab'); 
            cs2,ce2=cuts[1]; add(g(ce2),'whoosh_soft',-31,'leaderboard loads'); add(g(st[2]+3.4),'click',-25,'click Profile')
    # features
    t0=S['feat']
    for i,s0 in enumerate([0.0,3.5,7.2,10.8]):
        add(t0+s0,'whoosh_soft' if i else 'whoosh_short',-31,f'feature {i+1} window in')
    for tt,p in [(0.5,1.0),(0.8,1.05),(1.1,1.1),(3.5+0.5,1.0),(3.5+0.7,1.05),(3.5+1.0,1.1),(3.5+1.3,1.15),(3.5+1.5,0.95),(7.2+0.3,1.0),(7.2+0.5,1.05),(7.2+0.6,1.1),(7.2+0.9,1.15),(10.8+0.5,1.0),(10.8+0.8,1.05),(10.8+1.1,1.1),(10.8+1.4,1.15)]:
        add(t0+tt+0.3,'pop3',-29,'feature label/chip',p)
    # security
    t0=S['sec']; add(t0+0.1,'pop1',-28,'heading')
    for at in [0.5,1.4,5.0,5.7,8.9,10.1]:
        add(t0+at+0.05,'pop1',-26,'card in',1.0+0.03*rnd.random()); add(t0+at+0.85,'toggle',-28,'check badge')
    for i in range(22): add(t0+8.9+0.35+i*(1.3/22),'tick%d'%(1+i%3),-31,'tests counter tick',1.0+0.015*i)
    # end
    t0=S['end']; add(t0-1.2,'riser',-30,'riser into end card'); add(t0+0.3,'pop1',-25,'logo pops'); add(t0+1.0,'endchime',-25,'MUNERA reveal chime'); add(t0+1.45,'swish_zoom',-33,'underline')
    for i,tt in enumerate([3.0,3.3,3.6]): add(t0+tt+0.1,'pop3',-27,'url pill',1+0.05*i)
    cues.sort()
    with open('sfx-cues.csv','w',newline='') as fh:
        w=csv.writer(fh); w.writerow(['time_s','file','peak_dBFS','pitch_ratio','description'])
        for t,f,pk,d,p in cues: w.writerow([t,f'sfx/{f}.wav',pk,p,d])
    # render track
    track=np.zeros(int(VD*SR))
    for t,f,pk,d,p in cues:
        x=lib[f]
        if p!=1.0: x=np.interp(np.arange(0,len(x)-1,p),np.arange(len(x)),x)
        x=x/np.abs(x).max()*10**(pk/20)
        place(track,fade(x,2),t)
    sf.write('munera-sfx-track.wav',np.stack([track,track],1),SR,subtype='PCM_16')
    print('sfx cues',len(cues),'peak',round(db(np.abs(track).max()),1))
    json.dump(S,open('scene_starts.json','w'))

def stage_mix():
    v,_=sf.read('munera-voiceover-v2.wav',dtype='float32'); v=v.mean(1); x,_=sf.read('munera-sfx-track.wav',dtype='float32'); x=x.mean(1)
    n=min(len(v),len(x))
    # duck sfx under voice
    env=np.abs(v[:n]); env=signal.lfilter(*signal.butter(2,8/(SR/2)),env); env=np.clip(env/0.04,0,1)
    a=np.exp(-1/(0.03*SR)); r=np.exp(-1/(0.25*SR)); duck=np.zeros(n); c=0.0
    for i in range(0,n,48): # 1ms control rate
        tgt=env[i]; c=a*c+(1-a)*tgt if tgt>c else r*c+(1-r)*tgt
        duck[i:i+48]=c
    gain=1-0.5*duck
    mix=v[:n]+x[:n]*gain
    pk=np.abs(mix).max(); tgt=10**(-1.5/20)
    if pk>tgt: mix*=tgt/pk
    sf.write('munera-full-mix.wav',np.stack([mix,mix],1),SR,subtype='PCM_16')
    m=pyln.Meter(SR); print('mix LUFS',round(m.integrated_loudness(mix),1),'peak',round(db(np.abs(mix).max()),2),'voice LUFS',round(m.integrated_loudness(v),1),'sfx LUFS',round(m.integrated_loudness(x),1))

if __name__=='__main__':
    {'voice':stage_voice,'sfx':stage_sfx,'mix':stage_mix}[sys.argv[1]]()
