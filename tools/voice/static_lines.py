"""Spoken lines written inline in main.js and the mini-games, with who says them."""
ROOT = __import__('pathlib').Path(__file__).resolve().parents[2]

import glob
import json
import re
import sys

sys.path.insert(0, str(ROOT / 'tools/voice'))
from jsstrings import scan

JS = str(ROOT / 'docs/js') + '/'
NURSE_CALLS = {'nurseSay', 'nursePanel', 'ui.nurse'}
SAY_CALLS = {'G.say', 'say', 'parentSay', 'ui.say'}
BAD = re.compile(r'rgba?\(|#[0-9a-f]{3}|=>|\.js\b|\bpx\b|^[a-z0-9_-]+$|^\W*$|\{|\}|^https?:')


def looks_spoken(t):
    s = re.sub(r'<[^>]+>', '', t).strip()
    if not s or BAD.search(s):
        return False
    if not re.search(r'[A-Za-z]', s):
        return False
    words = s.split()
    return len(words) >= 2 or s.endswith(('!', '?', '.'))


def parts_of(item):
    """Static text of a literal; template expressions become a marker so those sentences are skipped."""
    if item[0] == 'str':
        return item[1]
    return '\x00'.join(p.replace('\x00', '') for p in item[1]) if item[3] else ''.join(item[1])


def collect(path, inline_only):
    out = []
    for item in scan(open(path).read()):
        text, ctx = parts_of(item), item[2]
        calls = set(ctx['calls'])
        if calls & NURSE_CALLS:
            who = 'nurse'
        elif calls & SAY_CALLS:
            who = 'patient'
        elif not inline_only and not ctx['calls'] and ctx['const'] and ctx['const'].isupper():
            who = 'patient'  # top-level pools of lines in the mini-games (OW, MISS, ...)
        else:
            continue
        if looks_spoken(text.replace('\x00', ' ')):
            out.append({'t': text, 'who': who, 'src': path.split('/')[-1]})
    return out


lines = collect(JS + 'main.js', True)
for f in sorted(glob.glob(JS + 'games/*.js')):
    lines += collect(f, False)
json.dump(lines, open(ROOT / 'tools/voice/static_lines.json', 'w'), indent=0)
print(len(lines), 'static lines;', sum(1 for l in lines if l['who'] == 'nurse'), 'nurse')
