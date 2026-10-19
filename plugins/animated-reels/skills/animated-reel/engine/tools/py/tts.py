# edge-tts with per-word timing (WordBoundary events, which the edge-tts CLI does not expose).
#   python tts.py <text> <voice> <rate> <output path without extension>   ->  <out>.mp3 and <out>.json [{ w, t0, t1 }]
import asyncio, json, sys, edge_tts
async def main(text, voice, rate, out):
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(out + ".mp3", "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t0": round(ch["offset"] / 1e7, 4), "t1": round((ch["offset"] + ch["duration"]) / 1e7, 4)})
    with open(out + ".json", "w", encoding="utf-8") as f:
        json.dump(words, f)
asyncio.run(main(*sys.argv[1:5]))
