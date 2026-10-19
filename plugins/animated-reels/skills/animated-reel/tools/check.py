#!/usr/bin/env python3
"""Final check of every <prefix>-NN-* folder in the workspace: what Instagram/TikTok/Shorts need.

Per folder: 1 MP4 + 1 cover + 1 .md; H.264 High yuv420p 1080x1920 at 30 fps; AAC 48 kHz; 15-45 s; <= 25 Mb/s;
loudness -14 +/- 1 LUFS and true peak <= -1 dBTP (ffmpeg loudnorm); cover 1080x1920; caption with no blocker.
Usage: python3 check.py [workspace=./reels-out] [prefix=reel]  -> exits 1 if any folder fails.
Needs ffmpeg, ffprobe and node on the PATH.
"""
import json, struct, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path('reels-out')
PREFIX = sys.argv[2] if len(sys.argv) > 2 else 'reel'


def probe(mp4):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,sample_rate',
                          '-of', 'json', str(mp4)], capture_output=True, text=True).stdout
    return json.loads(out)


def loudness(mp4):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(mp4), '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    j = json.loads(err[err.rindex('{'):err.rindex('}') + 1])
    return float(j['input_i']), float(j['input_tp'])


def png_size(p):
    with open(p, 'rb') as f:
        head = f.read(24)
    return struct.unpack('>II', head[16:24])


def check(folder):
    errors = []
    mp4s, covers, mds = list(folder.glob('*.mp4')), list(folder.glob('*-cover.png')), list(folder.glob('*.md'))
    if (len(mp4s), len(covers), len(mds)) != (1, 1, 1):
        errors.append(f'files: {len(mp4s)} mp4, {len(covers)} cover, {len(mds)} md (need 1 of each)')
    info = {}
    if mp4s:
        j = probe(mp4s[0])
        v = next((s for s in j['streams'] if s['codec_type'] == 'video'), {})
        a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), {})
        dur, br = float(j['format']['duration']), int(j['format'].get('bit_rate', 0))
        if (v.get('codec_name'), v.get('profile'), v.get('pix_fmt')) != ('h264', 'High', 'yuv420p'):
            errors.append(f"video {v.get('codec_name')} {v.get('profile')} {v.get('pix_fmt')}")
        if (v.get('width'), v.get('height'), v.get('r_frame_rate')) != (1080, 1920, '30/1'):
            errors.append(f"frame {v.get('width')}x{v.get('height')} {v.get('r_frame_rate')}")
        if (a.get('codec_name'), a.get('sample_rate')) != ('aac', '48000'):
            errors.append(f"audio {a.get('codec_name')} {a.get('sample_rate')}")
        if not 15 <= dur <= 45:
            errors.append(f'duration {dur:.1f} s')
        if br > 25_000_000:
            errors.append(f'bitrate {br / 1e6:.1f} Mb/s')
        i, tp = loudness(mp4s[0])
        if abs(i + 14) > 1:
            errors.append(f'loudness {i} LUFS')
        if tp > -1.0:
            errors.append(f'true peak {tp} dBTP')
        info = {'s': f'{dur:.1f}', 'Mb/s': f'{br / 1e6:.1f}', 'LUFS': f'{i:.1f}', 'dBTP': f'{tp:.1f}'}
    if covers and png_size(covers[0]) != (1080, 1920):
        errors.append(f'cover {png_size(covers[0])}')
    if mds:
        r = subprocess.run(['node', str(HERE / 'validate-caption.mjs'), str(mds[0])], capture_output=True, text=True, encoding='utf-8')
        if r.returncode != 0:
            errors.append('caption has blockers')
        info['warnings'] = str(r.stdout.count('⚠'))
    return errors, info


def main():
    folders = sorted(p for p in ROOT.glob(f'{PREFIX}-[0-9][0-9]-*') if p.is_dir())
    bad = 0
    for p in folders:
        errors, info = check(p)
        bad += bool(errors)
        extra = ' · '.join(f'{v} {k}' for k, v in info.items())
        print(f"{'FAIL' if errors else 'ok  '} {p.name:<40} {extra}" + (f"\n     {'; '.join(errors)}" if errors else ''))
    print(f'\n{len(folders) - bad} of {len(folders)} folders pass.')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
