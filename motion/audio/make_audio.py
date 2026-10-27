"""Habillage sonore du film (30 s), synthétisé et calé sur la timeline (src/timeline.js).

Les instants sont donnés en « temps du récit » (15 s), comme dans la timeline, puis multipliés par STRETCH.

python audio/make_audio.py audio/jardin-motion.wav
Pas de sample externe : pluck Karplus-Strong, marimba, kick, souffles et clics synthétisés.
"""
import sys
import numpy as np
import wave

SR = 48000
STRETCH = 2
DUR = 15.0 * STRETCH
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * STRETCH * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.002, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-5)) * np.exp(-t / d)


def hz(note):  # 'D4'
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = note[:-1], int(note[-1])
    return 440 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def pluck(f, dur=1.2, bright=0.5):
    n = int(SR * dur)
    p = int(SR / f)
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * (0.993 + 0.006 * bright)
    return out * env(n, 0.001, dur * 0.5)


def marimba(f, dur=0.9):
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.35 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.06)
    return s * np.minimum(1, t / 0.002)


def kick(gain=1.0):
    n = int(SR * 0.45)
    t = np.arange(n) / SR
    f = 46 + 120 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * gain + 0.12 * rng.standard_normal(n) * np.exp(-t / 0.004)


def noise_burst(dur, lp=0.2, d=0.05):
    n = int(SR * dur)
    x = rng.standard_normal(n)
    y = np.zeros(n)
    a = 0.0
    for i in range(n):  # passe-bas simple
        a += lp * (x[i] - a)
        y[i] = a
    return y * env(n, 0.001, d)


def hat():
    x = rng.standard_normal(int(SR * 0.06))
    x = np.diff(x, prepend=0)
    return x * env(len(x), 0.0005, 0.012) * 0.5


def whoosh(dur, rise=True):
    n = int(SR * dur * STRETCH)
    t = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    y = np.zeros(n)
    a = 0.0
    for i in range(n):
        c = 0.02 + 0.5 * (t[i] if rise else 1 - t[i]) ** 2
        a += c * (x[i] - a)
        y[i] = a
    shape = (t ** 2.2) if rise else (np.sin(np.pi * t) ** 1.5)
    return y * shape


def click(f=3200, d=0.008):
    n = int(SR * 0.03)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t / d) * 0.6 + rng.standard_normal(n) * np.exp(-t / 0.002) * 0.3


def thump(f=90):
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    fr = f + 80 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.08)


def shimmer(dur=0.5, base=1800):
    dur *= STRETCH
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * base * k * t + k) / k for k in (1, 1.5, 2.01, 3.02))
    return s * np.sin(np.pi * np.minimum(1, t / dur)) ** 2 * 0.25


def pad(notes, dur, gain=0.12):
    dur *= STRETCH
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * hz(x) * t) + 0.3 * np.sin(2 * np.pi * hz(x) * 2.003 * t) for x in notes)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.5)
    return s * a * gain / len(notes)


BEAT = 0.425 / STRETCH  # 141 bpm en temps réel : les coupes du site tombent sur la grille

# ——— accroche ———
add(marimba(hz('D5')), 0.36, 0.5)
add(noise_burst(0.12, 0.3, 0.03), 0.36, 0.25)
add(marimba(hz('A5')), 0.62, 0.3, 0.3)
add(whoosh(0.55), 0.98, 0.55)
add(shimmer(0.4, 900), 1.0, 0.5, -0.3)

# ——— lit musical sur la grille ———
prog = [['D3', 'F#4', 'A4', 'C#5'], ['B2', 'D4', 'F#4', 'A4'], ['G2', 'B3', 'D4', 'F#4'], ['A2', 'C#4', 'E4', 'A4']]
start, end = 1.5, 13.4
nb = int(round((end - start) / BEAT))
for b in range(nb):
    t = start + b * BEAT
    chord = prog[(b // 4) % 4]
    in_plan = 6.4 <= t < 8.4
    add(kick(), t, 0.9 if b % 2 == 0 else 0.55)
    add(hat(), t + BEAT / 2, 0.35, 0.4)
    if b % 4 == 0:
        add(pluck(hz(chord[0]), 1.6, 0.2), t, 0.55)
        add(pad(chord[1:], BEAT * 4 + 0.2), t, 0.9 if not in_plan else 0.6)
    arp = chord[1:] + [chord[2][:-1] + str(int(chord[2][-1]) + 1)]
    add(pluck(hz(arp[b % 4]), 0.8, 0.8), t + BEAT / 2, 0.22, -0.3 if b % 2 else 0.3)

# ——— Blender ———
for t in (1.46, 2.58, 3.18):
    add(whoosh(0.3, False), t - 0.05, 0.5, 0.6)
for t, f in ((1.74, 600), (2.7, 700), (3.27, 800)):
    add(shimmer(0.3, f), t, 0.35)
for t in (2.08, 2.88, 3.4):
    add(shimmer(0.38, 2200), t, 0.5, 0.2)
for i in range(6):
    add(marimba(hz(['D5', 'F#5', 'A5', 'C#6', 'E6', 'A6'][i]), 0.5), 3.68 + i * 0.03, 0.18, -0.5 + i * 0.2)

# ——— MCP ———
add(thump(70), 4.2, 0.5)
for i, (t0, n) in enumerate(((4.58, 16), (4.94, 13), (5.2, 23))):
    for k in range(n):
        add(click(2600 + 400 * rng.random()), t0 + k * 0.016, 0.12, 0.3)
    add(marimba(hz(['E6', 'F#6', 'A6'][i]), 0.4), t0 + n * 0.016 + 0.04, 0.22)
for i in range(6):
    add(marimba(hz(['A5', 'F#5', 'D5', 'A4', 'F#4', 'D4'][i]), 0.4), 5.68 + i * 0.055, 0.2)
add(whoosh(0.5), 5.9, 0.6)

# ——— plan ———
add(kick(1.2), 6.4, 0.8)
add(noise_burst(0.3, 0.1, 0.1), 6.4, 0.3)
scale = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6']
for i in range(8):
    add(marimba(hz(scale[i]), 0.6), 6.84 + i * 0.1, 0.32, -0.4 + i * 0.1)
add(whoosh(0.36, False), 8.0, 0.45, -0.4)

# ——— R3F ———
for t0, n in zip((8.44, 8.62, 8.8, 9.0, 9.18, 9.36, 9.56), (30, 12, 21, 15, 17, 24, 9)):
    for k in range(n):
        add(click(3000 + 600 * rng.random(), 0.006), t0 + k * 0.012, 0.09, -0.2)
add(shimmer(0.5, 500), 8.68, 0.4)
for i in range(4):
    add(thump(110 - i * 8), 9.12 + i * 0.06, 0.55, -0.3 + i * 0.2)
for i in range(4):
    add(marimba(hz(['D6', 'F#6', 'A6', 'D7'][i]), 0.3), 9.08 + i * 0.05, 0.14)
add(thump(80), 9.5, 0.6, 0.4)
add(shimmer(0.6, 2600), 9.46, 0.6)
add(whoosh(0.32), 9.7, 0.7)

# ——— le site ———
for i, t in enumerate((10.0, 10.85, 11.7, 12.55)):
    add(kick(1.1), t, 0.5)
    add(noise_burst(0.25, 0.25, 0.06), t, 0.22)
    add(marimba(hz(['D5', 'A5', 'B5', 'F#5'][i]), 0.6), t + 0.02, 0.3)
for k in range(15):
    add(click(1800 + k * 120, 0.01), 11.76 + k * 0.05, 0.12)
for i in range(4):
    add(marimba(hz(['A5', 'D6', 'F#6', 'A6'][i]), 0.4), 12.7 + i * 0.16, 0.18, 0.4)

# ——— fin ———
add(kick(1.4), 13.4, 0.9)
add(noise_burst(0.5, 0.08, 0.2), 13.4, 0.3)
add(pad(['D3', 'A3', 'F#4', 'A4', 'E5'], 1.6, 0.22), 13.4, 1.0)
order = [3, 4, 2, 5, 1, 6, 0, 7]
fruit_notes = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6']
for j in range(8):
    add(marimba(hz(fruit_notes[j]), 0.7), 13.76 + j * 0.05, 0.26, -0.6 + j * 0.17)
add(pluck(hz('D3'), 1.6, 0.2), 13.4, 0.6)
add(shimmer(1.2, 1500), 13.9, 0.35)

# ——— master : passe-haut doux, compression légère, fondu final ———
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 0.9) / np.tanh(0.9)
fade = np.ones(N)
fade[-int(SR * 0.6):] = np.linspace(1, 0, int(SR * 0.6)) ** 1.5
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) / 0.89
out = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'audio/jardin-motion.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(out.tobytes())
print('ok')
