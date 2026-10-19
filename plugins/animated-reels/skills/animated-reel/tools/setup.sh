#!/bin/sh
# Builds (or updates) the reel workspace from this skill's engine. Run it before any work: it is idempotent, and what
# is already there (node_modules, out/, Chromium, the whisper model, edge-tts) is not fetched again.
#   sh "${CLAUDE_SKILL_DIR}/tools/setup.sh" [workspace]        default workspace: ./reels-out
#
# Layout: <workspace>/engine (the working copy: node_modules, out/), <workspace>/models/ggml-base.en.bin (whisper),
# and the delivered reels in <workspace>/reel-NN-<slug>/.
# The skill's engine/ is copied OVER <workspace>/engine without deleting anything there, and a file that is newer in
# the workspace (a reel script in progress) is not overwritten by the older copy.
set -e
SKILL=$(cd "$(dirname "$0")/.." && pwd)
WS=${1:-./reels-out}
mkdir -p "$WS/engine" "$WS/models"
WS=$(cd "$WS" && pwd)
command -v node >/dev/null && command -v npm >/dev/null || { echo "Node.js and npm are required: https://nodejs.org"; exit 1; }

# 1. the engine: code, style kit, art and cast
if command -v rsync >/dev/null; then
  rsync -a --update --exclude node_modules --exclude out "$SKILL/engine/" "$WS/engine/"
else
  ( cd "$SKILL/engine" && find . \( -name node_modules -o -name out \) -prune -o -type f -print ) | while IFS= read -r f; do
    dst="$WS/engine/$f"
    if [ ! -e "$dst" ] || [ "$SKILL/engine/$f" -nt "$dst" ]; then mkdir -p "$(dirname "$dst")"; cp -p "$SKILL/engine/$f" "$dst"; fi
  done
fi

# 2. dependencies (playwright, three) and Chromium; with CHROMIUM_PATH set, that browser is used instead
cd "$WS/engine"
npm install --no-audit --no-fund --loglevel=error
if [ -z "${CHROMIUM_PATH:-}" ]; then
  npx playwright install chromium   # on Linux, missing system libraries: npx playwright install-deps chromium
fi

# 3. fonts (open licenses) into assets/fonts/, and the editorial paper texture
node tools/fonts.mjs || echo "WARNING: font download failed; run setup.sh again to retry"
[ -f assets/style/editorial/paper.png ] || node assets/style/editorial/paper.mjs

# 4. whisper base.en (142 MB) for the voice-over check. Flaky connections reset mid-download: hence the retries.
if [ ! -s "$WS/models/ggml-base.en.bin" ]; then
  echo "downloading whisper base.en (142 MB)..."
  if curl -fsSL --retry 8 --retry-all-errors -o "$WS/models/ggml-base.en.bin.part" \
      https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin; then
    mv "$WS/models/ggml-base.en.bin.part" "$WS/models/ggml-base.en.bin"
  else
    rm -f "$WS/models/ggml-base.en.bin.part"
    echo "WARNING: whisper model download failed; the voice-over check will be skipped until it is in $WS/models/"
  fi
fi

# 5. edge-tts in a Python of its own: tools/vo.mjs needs the per-word timing (WordBoundary), which the CLI does not
#    expose. Looked up the way vo.mjs does: EDGE_TTS_PYTHON, the uv tool environment, then python3 / python.
APPDATA_U=${APPDATA:-}
[ -n "$APPDATA_U" ] && command -v cygpath >/dev/null && APPDATA_U=$(cygpath -u "$APPDATA_U")
have_edge_tts() {
  for py in "${EDGE_TTS_PYTHON:-}" \
            "${UV_TOOL_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/uv/tools}/edge-tts/bin/python" \
            "${UV_TOOL_DIR:-$APPDATA_U/uv/tools}/edge-tts/Scripts/python.exe" \
            python3 python; do
    [ -n "$py" ] && "$py" -c "import edge_tts" >/dev/null 2>&1 && return 0
  done
  return 1
}
if ! have_edge_tts; then
  if command -v uv >/dev/null; then
    # --force replaces a broken install whose links survived (uv refuses to reinstall over them otherwise)
    uv tool install --force edge-tts || echo "WARNING: uv tool install edge-tts failed"
  else
    PY=""
    for p in python3 python; do "$p" -c "import sys" >/dev/null 2>&1 && { PY=$p; break; }; done
    if [ -n "$PY" ]; then
      "$PY" -m pip install --user edge-tts || echo "WARNING: pip could not install edge-tts; install uv (https://docs.astral.sh/uv/) and run setup.sh again, or set EDGE_TTS_PYTHON"
    else
      echo "WARNING: no Python found: install uv (https://docs.astral.sh/uv/) or Python 3, then run setup.sh again"
    fi
  fi
fi

# 6. binaries the pipeline calls
for b in ffmpeg ffprobe magick "${WHISPER_CLI:-whisper-cli}"; do
  command -v "$b" >/dev/null || echo "WARNING: not on PATH: $b"
done

# 7. the GPU: without one Chromium renders on the CPU and a full render takes far longer
node tools/gputest.mjs || echo "WARNING: the GPU check failed (see above)"
echo "ready: $WS/engine"
