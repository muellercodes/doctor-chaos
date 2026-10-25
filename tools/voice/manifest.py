"""Write docs/voice/manifest.json from the clips that exist."""
ROOT = __import__('pathlib').Path(__file__).resolve().parents[2]

import json, os
OUT = str(ROOT / 'docs/voice') + '/'
# kind of speaker -> recorded voice and a pitch/speed nudge (playback rate)
VOICES = {
    'nurse': [{'id': 'af_heart', 'shift': 1.0}],
    'kid': [{'id': 'af_bella', 'shift': 1.16}],
    'teenf': [{'id': 'af_bella', 'shift': 1.06}],
    'teenm': [{'id': 'am_puck', 'shift': 1.04}],
    'adultf': [{'id': 'af_bella', 'shift': 1.0}],
    'adultm': [{'id': 'am_michael', 'shift': 0.98}],
    'elderf': [{'id': 'bf_emma', 'shift': 0.94}],
    'elderm': [{'id': 'bm_george', 'shift': 0.92}],
}
lines, total = {}, 0
for v in sorted({x['id'] for l in VOICES.values() for x in l}):
    d = OUT + v
    keys = sorted(f[:-4] for f in os.listdir(d) if f.endswith('.mp3')) if os.path.isdir(d) else []
    lines[v] = ' '.join(keys)
    total += len(keys)
json.dump({'v': 2, 'voices': VOICES, 'lines': lines}, open(OUT + 'manifest.json', 'w'), separators=(',', ':'))
print('manifest:', total, 'clips', {v: len(k.split()) if k else 0 for v, k in lines.items()}, os.path.getsize(OUT + 'manifest.json') // 1024, 'KB')
