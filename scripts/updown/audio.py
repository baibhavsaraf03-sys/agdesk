"""
Up or Down sound (18 Nov): writes audio.wav in outdir.

    python3 audio.py <outdir> <kokoro:<dir>:<voice> | none> '<json>'

json: seconds, T (intro, replay, hold, reveal), ask, answer, dir.
The question is spoken at the start and the answer at the reveal (Kokoro,
free, offline); a soft tick for each of the 15 replayed minutes, a pulse that
quickens in the last three seconds, a rising or falling chord on the reveal,
and a quiet bed under it all. Everything is synthesised here.
"""
import json, os, sys
import numpy as np

out, voice, cfg = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
SR = 48000
T = cfg["T"]; total = cfg["seconds"]
n = int(total * SR)
mix = np.zeros(n)
t = np.arange(n) / SR

def put(at, sig, gain=1.0):
    s = int(at * SR)
    if s >= n: return
    e = min(n, s + len(sig)); mix[s:e] += sig[: e - s] * gain

def tone(f0, f1, dur, amp, decay):
    tt = np.arange(int(dur * SR)) / SR
    f = np.linspace(f0, f1, len(tt))
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * decay)

# Voice.
def speak(text):
    if not voice.startswith("kokoro:"): return None
    _, kdir, kv = voice.split(":", 2)
    from kokoro_onnx import Kokoro
    k = speak.k = getattr(speak, "k", None) or Kokoro(os.path.join(kdir, "kokoro-v1.0.onnx"), os.path.join(kdir, "voices-v1.0.bin"))
    a, rate = k.create(text, voice=kv, speed=1.12, lang="en-gb" if kv.startswith("b") else "en-us")
    a = np.asarray(a, dtype=np.float32)
    idx = np.linspace(0, len(a) - 1, int(len(a) * SR / rate))
    return np.interp(idx, np.arange(len(a)), a)

ask = speak(cfg["ask"])
if ask is not None: put(0.15, ask, 0.95)
ans = speak(cfg["answer"])
reveal = T["intro"] + T["replay"] + T["hold"]
if ans is not None: put(reveal + 0.25, ans, 1.0)

# Ticks: one per replayed minute.
for k in range(16):
    put(T["intro"] + T["replay"] * k / 15, tone(2400, 1800, 0.03, 0.12, 120))
# Quickening pulse in the last three seconds of the replay and the hold.
a = T["intro"] + T["replay"] - 3
x = a
while x < reveal:
    put(x, tone(110, 55, 0.18, 0.35, 18))
    x += max(0.16, 0.5 - (x - a) * 0.12)
# Reveal chord.
ch = [523.25, 659.25, 783.99] if cfg["dir"] == "up" else [440.0, 349.23, 293.66]
for i, f in enumerate(ch):
    put(reveal + i * 0.07, tone(f, f, 1.4, 0.12, 2.2))
put(reveal, tone(80, 40, 0.5, 0.5, 8))

# Bed: a low pulse that builds through the replay, then settles.
bed = 0.02 * np.sin(2 * np.pi * 55 * t) + 0.012 * np.sin(2 * np.pi * 82.41 * t)
build = np.clip((t - T["intro"]) / T["replay"], 0, 1)
bed *= (0.5 + build) * np.where(t < reveal, 1, np.exp(-(t - reveal) * 2))
mix += bed * np.minimum(1, t / 0.6)

mix *= np.minimum(1, np.maximum(0, (total - t) / 0.4))
peak = np.max(np.abs(mix)) or 1
mix = mix / max(1, peak / 0.95)
import wave
with wave.open(os.path.join(out, "audio.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"audio {total:.1f}s, voice={'yes' if voice.startswith('kokoro:') else 'no'}")
