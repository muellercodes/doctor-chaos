"""Record every harvested sentence with Kokoro, one MP3 per sentence per voice.
Resumable: clips that already exist are skipped. Most-heard lines go first."""
ROOT = __import__('pathlib').Path(__file__).resolve().parents[2]

import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from kokoro_onnx import Kokoro

M = os.environ.get('KOKORO_DIR', os.path.expanduser('~/kokoro_models')) + '/'
OUT = str(ROOT / 'docs/voice') + '/'
LOG = str(ROOT / 'tools/voice/gen.log')
# which Kokoro voice records each kind of speaker
VOICE_OF = {'nurse': 'af_heart', 'kid': 'af_bella', 'teenf': 'af_bella', 'adultf': 'af_bella',
            'teenm': 'am_puck', 'adultm': 'am_michael', 'elderm': 'bm_george', 'elderf': 'bf_emma'}
ORDER = ['NURSE', 'FOOD_QUIPS', 'tutorial', 'day', 'REMARKS', 'SUCCESS', 'FAIL', 'IMPATIENT', 'WRONG_TOOL', 'PICKLES',
         'STEP_TALK', 'goodbye', 'static', 'persona', 'special', 'normal', 'EXCUSES', 'TAILS', 'food', 'FOOD', 'foodGoodbye']


def rank(line):
    best = len(ORDER)
    for s in line['src']:
        for i, o in enumerate(ORDER):
            if s.startswith(o):
                best = min(best, i)
    return best


def encode(audio, path):
    tmp = path + '.part'
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', '24000', '-ac', '1', '-i', 'pipe:',
                        '-codec:a', 'libmp3lame', '-b:a', '32k', '-ar', '24000', '-f', 'mp3', tmp],
                       input=audio.astype(np.float32).tobytes(), capture_output=True)
    if p.returncode == 0:
        os.replace(tmp, path)
    else:
        print('ffmpeg failed', path, p.stderr[:200], file=sys.stderr)


def level(a):
    """Even out loudness between voices: aim for the same speech level, never clip."""
    if not len(a):
        return a
    rms = float(np.sqrt(np.mean(a ** 2))) or 1e-6
    a = a * (0.075 / rms)
    peak = float(np.max(np.abs(a)))
    if peak > 0.95:
        a = a * (0.95 / peak)
    # 15 ms fades so clips never click
    f = min(len(a) // 4, 360)
    if f:
        ramp = np.linspace(0, 1, f, dtype=np.float32)
        a[:f] *= ramp
        a[-f:] *= ramp[::-1]
    return a


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    lines = json.load(open(ROOT / 'tools/voice/lines.json'))
    lines.sort(key=rank)
    jobs = []
    for l in lines:
        for v in sorted({VOICE_OF[c] for c in l['cats']}):
            path = f'{OUT}{v}/{l["key"]}.mp3'
            if not os.path.exists(path):
                jobs.append((v, l['say'], path))
    if limit:
        jobs = jobs[:limit]
    for v in set(VOICE_OF.values()):
        os.makedirs(OUT + v, exist_ok=True)
    k = Kokoro(M + 'kokoro-v1.0.onnx', M + 'voices-v1.0.bin')
    pool = ThreadPoolExecutor(2)
    t0, secs, fails = time.time(), 0.0, 0
    with open(LOG, 'a') as log:
        log.write(f'start {time.ctime()} jobs={len(jobs)}\n')
        for i, (v, say, path) in enumerate(jobs, 1):
            try:
                a, sr = k.create(say, voice=v, speed=1.0, lang='en-gb' if v.startswith('b') else 'en-us')
            except Exception as e:  # a sentence Kokoro cannot read stays on the device voice
                fails += 1
                log.write(f'skip {v} {say!r}: {e}\n')
                continue
            secs += len(a) / sr
            pool.submit(encode, level(np.asarray(a, dtype=np.float32)), path)
            if i % 100 == 0 or i == len(jobs):
                el = time.time() - t0
                log.write(f'{i}/{len(jobs)} audio={secs/60:.1f}min elapsed={el/60:.1f}min eta={el/i*(len(jobs)-i)/60:.0f}min fails={fails}\n')
                log.flush()
    pool.shutdown(wait=True)
    print('done', len(jobs), 'clips', f'{secs/60:.1f} min of audio in {(time.time()-t0)/60:.1f} min, fails={fails}')


if __name__ == '__main__':
    main()
