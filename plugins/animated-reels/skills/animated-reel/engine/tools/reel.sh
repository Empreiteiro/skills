#!/bin/sh
# One reel end to end: voice-over (if any) -> soundtrack -> render -> master -> cover -> QA -> delivery.
#   sh tools/reel.sh <id> [sub=1] [workers=3]
#   SKIP_RENDER=1 sh tools/reel.sh <id>   # no render: redo voice-over, music, master and cover over the existing video.mkv
# Delivers to "${REELS_OUT:-<parent of this engine>}/reel-NN-<slug>/" as <date>-reel-NN-<slug>.mp4 and
# <date>-reel-NN-<slug>-cover.png (NN, slug and date come from the reel's META).
# Needs ffmpeg and ffprobe on the PATH.
set -e
cd "$(dirname "$0")/.."
# Run the workspace copy made by setup.sh, never the engine inside the skill: out/ (gigabytes), node_modules and the
# delivery would all land in the skill folder.
case "$(pwd)" in
  */skills/animated-reel/engine|*\\skills\\animated-reel\\engine)
    echo "this is the skill's own engine: run the workspace copy instead (sh <skill>/tools/setup.sh [workspace])"; exit 2;;
esac
ID=$1; SUB=${2:-1}; WORKERS=${3:-3}
[ -n "$ID" ] || { echo "usage: sh tools/reel.sh <id> [sub=1] [workers=3]"; exit 2; }
O=out/$ID; mkdir -p "$O/qa"
if [ -f "src/reels/$ID.vo.js" ]; then
  node tools/vo.mjs --reel "$ID" > "$O/qa/vo.txt" || { cat "$O/qa/vo.txt"; echo "voice-over failed"; exit 1; }
  grep -E "^(voice-over:|WARNING)" "$O/qa/vo.txt" || true
fi
INFO=$(node --input-type=module -e "const l = await import('./tools/lib.mjs'); const { DUR, META } = await l.reelInfo(process.argv[1]); if (!META || !META.num || !META.slug || !META.date) { console.error('src/reels/' + process.argv[1] + '.js must export META { num, slug, date }'); process.exit(1); } console.log('DUR=' + DUR + '; NUM=' + META.num + '; SLUG=' + META.slug + '; DATE=' + META.date)" "$ID")
eval "$INFO"

node tools/audio.mjs --reel "$ID" > "$O/qa/audio.txt"
grep -E "^FINAL|worst error|^voice:|WARNING" "$O/qa/audio.txt" || true
if [ "${SKIP_RENDER:-}" = 1 ]; then
  [ -f "$O/video.mkv" ] || { echo "SKIP_RENDER=1 needs an existing $O/video.mkv"; exit 2; }
else
  node tools/render.mjs --reel "$ID" --sub "$SUB" --workers "$WORKERS" --out "$O/video.mkv"
fi

# master: grain on luma only, x264 capped at 22 Mb/s (Reels accepts up to 25), AAC 48 kHz, exact duration
ffmpeg -v error -y -i "$O/video.mkv" -i "$O/audio/music.wav" \
  -filter:v "format=yuv444p,noise=c0s=3:c0f=t+u,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -maxrate 22M -bufsize 44M -profile:v high -tune film -g 60 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -ar 48000 -t "$DUR" -movflags +faststart "$O/final.mp4"
node tools/cover.mjs --reel "$ID" --out "$O/cover.png" > /dev/null

# QA: format, loudness of the final file, contact sheet at 1 frame/s
ffprobe -v error -show_entries format=duration,bit_rate:stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate -of compact "$O/final.mp4" | tee "$O/qa/probe.txt"
ffmpeg -nostats -i "$O/final.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|LRA:|Peak:)" | tee "$O/qa/loudness.txt"
ffmpeg -v error -y -i "$O/final.mp4" -vf "fps=1,scale=180:-1,tile=9x5:padding=4:color=0x222222" -frames:v 1 "$O/qa/sheet.png"

DEST="${REELS_OUT:-$(cd .. && pwd)}/reel-$NUM-$SLUG"
BASE="$DATE-reel-$NUM-$SLUG"
mkdir -p "$DEST"
cp "$O/final.mp4" "$DEST/$BASE.mp4"
cp "$O/cover.png" "$DEST/$BASE-cover.png"
echo "delivered: $DEST/$BASE.mp4 (+ -cover.png) · $DUR s"
