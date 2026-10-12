#!/bin/bash
# trim leading/trailing silence only, mono 48k, HPF, de-ess, gentle compression
cd "$(dirname "$0")"; mkdir -p clean
for f in raw/*.mp3; do id=$(basename $f .mp3)
ffmpeg -y -v error -i $f -ar 48000 -ac 1 -af "silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.08,areverse,highpass=f=70,deesser=i=0.25:m=0.5:f=0.5:s=o,acompressor=threshold=-21dB:ratio=2.5:attack=8:release=90:makeup=2" clean/$id.wav; done
