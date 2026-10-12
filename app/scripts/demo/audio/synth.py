#!/usr/bin/env python3
"""Synthesize narration lines with edge-tts (en-US-AndrewMultilingualNeural), clean + level each, report fit against cue slots."""
import json, subprocess, sys, os
V=os.environ.get("VOICE","en-US-AndrewMultilingualNeural"); RATE=os.environ.get("RATE","-6%")
lines=json.load(open('/workspace/munera/app/scripts/demo/lines.json'))
over=json.load(open('/workspace/demo-work/overrides.json')) if os.path.exists('/workspace/demo-work/overrides.json') else {}
os.makedirs('raw',exist_ok=True)
for l in lines:
    t=over.get(l['id'],{}).get('text',l['text']); r=over.get(l['id'],{}).get('rate',RATE)
    mp3=f"raw/{l['id']}.mp3"
    if os.path.exists(mp3) and not os.environ.get("FORCE"): continue
    subprocess.run(['/workspace/voice/v2/bin/edge-tts','--voice',V,f'--rate={r}','--text',t,'--write-media',mp3],check=True,capture_output=True)
    print('synth',l['id'])
