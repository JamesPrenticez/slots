#!/usr/bin/env bash
#
# mp3-to-m4a.sh — convert MP3 audio to M4A (AAC 128k) with ffmpeg.
#
# Usage:
#   pnpm audio:m4a                         # convert every *.mp3 in raw-assets/audio
#   pnpm audio:m4a raw-assets/audio/oof.mp3  # convert one (or more) named files
#
# The .m4a is written alongside each source .mp3. The .mp3 is left in place.
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "error: ffmpeg not found on PATH (try: brew install ffmpeg)" >&2
  exit 1
fi

# No args → convert everything under raw-assets/audio.
if [ "$#" -eq 0 ]; then
  set -- raw-assets/audio/*.mp3
fi

for src in "$@"; do
  if [ ! -f "$src" ]; then
    echo "skip: $src (not a file)" >&2
    continue
  fi
  out="${src%.mp3}.m4a"
  ffmpeg -y -loglevel error -i "$src" -c:a aac -b:a 128k "$out"
  echo "converted: $src → $out"
done
