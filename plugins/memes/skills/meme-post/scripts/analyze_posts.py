#!/usr/bin/env python3
"""Turn a page's post archive into voice references: the top posts, the comment champions and the numbers.

    python3 analyze_posts.py posts.csv --out voice/
    python3 analyze_posts.py posts.json --text overlay --caption description --likes like_count

Input: a CSV, or a JSON list of objects, one per post. Columns are matched by name, case-insensitively; pass
--text/--caption/--likes/--comments/--saves/--date when the names differ. Only --caption and --likes are required.

Writes three files to --out (default `voice/`):

    examples.md       the top posts by likes: art text + caption, without hashtags or padding
    top-comments.md   the posts that drew the most comments
    stats.md          caption length, lowercase share, the question effect, hashtag habits
"""
import argparse, collections, csv, json, os, re, statistics, sys

CANDIDATES = {
    'text': ('text', 'image_text', 'art', 'overlay', 'overlay_text', 'alt_text'),
    'caption': ('caption', 'description', 'legend', 'message'),
    'likes': ('likes', 'like_count', 'reactions'),
    'comments': ('comments', 'comments_count', 'comment_count'),
    'saves': ('saves', 'saved', 'save_count'),
    'date': ('date', 'timestamp', 'publish time', 'published', 'created_at', 'created_time'),
}
HASHTAG = re.compile(r'#\w+', re.UNICODE)
PADDING = '⠀'                     # blank Braille: pushes hashtags below "more"


def load(path):
    if path.endswith('.json'):
        rows = json.load(open(path, encoding='utf-8'))
        return rows if isinstance(rows, list) else rows.get('data', [])
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def pick(rows, field, given):
    if given:
        return given
    keys = {k.lower().strip(): k for k in (rows[0] if rows else {})}
    for name in CANDIDATES[field]:
        if name in keys:
            return keys[name]
    return None


def number(v):
    if v in (None, ''):
        return None
    try:
        return int(float(str(v).replace(',', '')))
    except ValueError:
        return None


def clean(caption):
    """The caption without hashtags, invisible padding or dot-only spacer lines."""
    text = HASHTAG.sub('', str(caption or '')).replace(PADDING, '')
    lines = [l.strip() for l in text.split('\n')]
    return '\n'.join(l for l in lines if l and l.strip('. ')).strip()


def one_line(s):
    return ' / '.join(l.strip() for l in str(s or '').split('\n') if l.strip())


def median(xs):
    m = statistics.median(xs) if xs else 0
    return int(m) if float(m).is_integer() else round(m, 1)


def pct(part, whole):
    return '%d%%' % round(100 * part / whole) if whole else '-'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('archive')
    for field in CANDIDATES:
        ap.add_argument('--' + field, help='column with the %s' % field)
    ap.add_argument('--top', type=int, default=300, help='posts in examples.md (default 300)')
    ap.add_argument('--top-comments', type=int, default=40, help='posts in top-comments.md (default 40)')
    ap.add_argument('--out', default='voice')
    a = ap.parse_args()

    rows = load(a.archive)
    col = {f: pick(rows, f, getattr(a, f)) for f in CANDIDATES}
    for f in ('caption', 'likes'):
        if not col[f]:
            sys.exit('no %s column found; pass --%s with its name. Columns: %s'
                     % (f, f, ', '.join(rows[0]) if rows else 'none'))

    posts = []
    for r in rows:
        raw = r.get(col['caption']) or ''
        posts.append({
            'text': (r.get(col['text']) or '').strip() if col['text'] else '',
            'raw': raw,
            'caption': clean(raw),
            'tags': HASHTAG.findall(raw),
            'likes': number(r.get(col['likes'])),
            'comments': number(r.get(col['comments'])) if col['comments'] else None,
            'saves': number(r.get(col['saves'])) if col['saves'] else None,
            'date': str(r.get(col['date']) or '')[:10] if col['date'] else '',
        })
    measured = [p for p in posts if p['likes'] is not None]
    os.makedirs(a.out, exist_ok=True)

    def entry(p):
        bits = ['%s likes' % format(p['likes'], ',')]
        if p['saves'] is not None:
            bits.append('%s saves' % format(p['saves'], ','))
        if p['comments'] is not None:
            bits.append('%s comments' % format(p['comments'], ','))
        if p['date']:
            bits.append(p['date'])
        return ' · '.join(bits)

    top = sorted(measured, key=lambda p: -p['likes'])[:a.top]
    with open(os.path.join(a.out, 'examples.md'), 'w', encoding='utf-8') as f:
        f.write('# The %d posts with the most likes\n\n' % len(top))
        f.write('From `%s`. **ART** = the text on the image; **CAPTION** = the post text without hashtags or '
                'padding.\nUse them for voice and structure — never copy a line.\n\n---\n\n' % os.path.basename(a.archive))
        for i, p in enumerate(top, 1):
            f.write('### %d. %s\n' % (i, entry(p)))
            if p['text']:
                f.write('- **ART:** %s\n' % one_line(p['text']))
            f.write('- **CAPTION:** %s\n\n' % one_line(p['caption']))

    with_comments = [p for p in measured if p['comments'] is not None]
    if with_comments:
        champs = sorted(with_comments, key=lambda p: -p['comments'])[:a.top_comments]
        with open(os.path.join(a.out, 'top-comments.md'), 'w', encoding='utf-8') as f:
            f.write('# The %d posts that drew the most comments\n\n' % len(champs))
            f.write('Look at what the caption does: most of these ask the follower something.\n\n')
            for i, p in enumerate(champs, 1):
                f.write('%d. **%s comments** (_%s likes_)\n' % (i, format(p['comments'], ','), format(p['likes'], ',')))
                if p['text']:
                    f.write('   - ART: %s\n' % one_line(p['text']))
                f.write('   - CAPTION: %s\n\n' % one_line(p['caption']))

    # ------------------------------------------------------------- stats
    caps = [p['caption'] for p in measured if p['caption']]
    lengths = sorted(len(c) for c in caps)
    out = ['# Voice stats', '', 'From `%s`: %d posts, %d with likes, %s likes in total.'
           % (os.path.basename(a.archive), len(posts), len(measured), format(sum(p['likes'] for p in measured), ',')), '']
    out += ['## Caption', '',
            '- Median length: %d characters; 90%% are under %d.'
            % (median(lengths), lengths[int(len(lengths) * 0.9)] if lengths else 0),
            '- Starts in lowercase: %s.' % pct(sum(c[:1].islower() for c in caps), len(caps)),
            '- Uses invisible padding (U+2800): %s.' % pct(sum(PADDING in p['raw'] for p in posts), len(posts))]
    texts = [len(p['text']) for p in measured if p['text']]
    if texts:
        out.append('- Art text median length: %d characters.' % median(texts))
    out.append('')

    if with_comments:
        def split(ps):
            q = [p for p in ps if '?' in p['caption']]
            n = [p for p in ps if '?' not in p['caption']]
            return q, n
        q, n = split(with_comments)
        out += ['## The question effect', '',
                'Captions with a question vs without, medians:', '',
                '| | posts | comments | likes |', '|---|---|---|---|',
                '| with `?` | %d | %s | %s |' % (len(q), median([p['comments'] for p in q]), median([p['likes'] for p in q])),
                '| without | %d | %s | %s |' % (len(n), median([p['comments'] for p in n]), median([p['likes'] for p in n]))]
        years = sorted({p['date'][:4] for p in with_comments if p['date'][:4].isdigit()})
        if len(years) > 1:
            out += ['', 'Per year (an effect that holds inside each year is not just the period):', '',
                    '| year | comments with `?` | without |', '|---|---|---|']
            for y in years:
                q, n = split([p for p in with_comments if p['date'].startswith(y)])
                out.append('| %s | %s (%d) | %s (%d) |' % (y, median([p['comments'] for p in q]), len(q),
                                                         median([p['comments'] for p in n]), len(n)))
        out.append('')

    tagged = [p for p in posts if p['tags']]
    out += ['## Hashtags', '', '- Posts with hashtags: %s; median %d per tagged post.'
            % (pct(len(tagged), len(posts)), median([len(p['tags']) for p in tagged])), '']
    blocks = collections.Counter(' '.join(sorted(set(t.lower() for t in p['tags']))) for p in tagged)
    if blocks:
        out += ['Most repeated sets (a page that pastes fixed blocks shows up here):', '']
        out += ['- %d posts: `%s`' % (c, b) for b, c in blocks.most_common(5) if c > 1] or ['- none repeated']
        out.append('')
    tags = collections.Counter(t.lower() for p in tagged for t in set(p['tags']))
    out += ['Most used tags: ' + ', '.join('`%s` (%d)' % (t, c) for t, c in tags.most_common(20)), '']
    with open(os.path.join(a.out, 'stats.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print('wrote %s' % ', '.join(os.path.join(a.out, n) for n in sorted(os.listdir(a.out))))


if __name__ == '__main__':
    main()
