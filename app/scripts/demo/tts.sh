#!/usr/bin/env bash
# Generate narration WAVs with Piper (offline neural TTS, voice en_US-ryan-high) into $OUT (default /workspace/demo-work/audio)
set -e
VOICE=${VOICE:-/workspace/voice/en_US-ryan-high.onnx}; OUT=${OUT:-/workspace/demo-work/audio}; PIPER=${PIPER:-/workspace/voice/venv/bin/piper}
mkdir -p "$OUT"; cd "$(dirname "$0")"
node -e 'for (const l of require("./lines.json")) console.log(l.id+"\t"+l.text)' | while IFS=$'\t' read -r id text; do
  echo "$text" | "$PIPER" -m "$VOICE" --length-scale 1.05 --sentence-silence 0.25 --output_file "$OUT/$id.wav" >/dev/null 2>&1
  echo "$id $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$id.wav")"
done
