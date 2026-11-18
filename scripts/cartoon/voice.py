"""
The cartoon's sound (18 Nov): narrator voice, timeline and the mixed track.

    python3 voice.py <episode.json> <outdir> <voice.onnx>

Speaks each beat with Piper (free, runs offline), lays the beats end to end,
times the caption chunks across each spoken line, and mixes the voice with a
pop on every caption, a thud under every stamp and a quiet music bed made here
(so there is nothing to license). Writes timeline.json and audio.wav.
Without a voice model (VOICE=none) the timings are estimated and the track has
no narration, for quick silent previews.
"""
import json, os, re, sys, wave
import numpy as np

ep_path, out, model = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else "none")
os.makedirs(out, exist_ok=True)
ep = json.load(open(ep_path))
SR = 48000
GAP, LEAD, TAIL = 0.22, 0.25, 0.6

def spoken(text):
    # Say figures the way a person would, so the voice doesn't read symbols.
    t = text.replace("£", " pounds ").replace("%", " percent")
    return re.sub(r"\s+", " ", t).strip()

voices = []
if model != "none" and os.path.exists(model):
    from piper import PiperVoice
    try:
        from piper import SynthesisConfig
        cfg = SynthesisConfig(length_scale=float(os.environ.get("PACE", "0.86")))
    except Exception:
        cfg = None
    v = PiperVoice.load(model)
    for i, b in enumerate(ep["beats"]):
        f = os.path.join(out, f"beat-{i:02d}.wav")
        with wave.open(f, "wb") as w:
            v.synthesize_wav(spoken(b["say"]), w, syn_config=cfg) if cfg else v.synthesize_wav(spoken(b["say"]), w)
        with wave.open(f) as w:
            rate, data = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        # Trim the silence Piper leaves at both ends.
        nz = np.where(np.abs(data) > 0.02)[0]
        if len(nz): data = data[max(0, nz[0] - int(0.02 * rate)): nz[-1] + int(0.05 * rate)]
        idx = np.linspace(0, len(data) - 1, int(len(data) * SR / rate))
        voices.append(np.interp(idx, np.arange(len(data)), data))
else:
    for b in ep["beats"]:
        words = len(b["say"].split())
        voices.append(np.zeros(int((0.35 + words * 0.31) * SR)))

# Timeline: beats end to end; caption chunks spread over the spoken line by length.
beats, t = [], LEAD
for b, vo in zip(ep["beats"], voices):
    dur = len(vo) / SR
    chunks = [c.strip() for c in b["cap"].split("/") if c.strip()]
    weights = [max(3, len(re.sub(r"[^A-Za-z0-9£%]", "", c))) for c in chunks]
    acc, ch = 0, []
    for c, wgt in zip(chunks, weights):
        ch.append({"t": round(t + dur * acc / sum(weights) * 0.92, 3), "text": c})
        acc += wgt
    end = t + dur + GAP + (0.9 if b.get("scene") in ("vote",) else 0)
    beats.append({"start": round(t - (LEAD if not beats else 0), 3), "voice": round(t, 3), "end": round(end, 3), "chunks": ch, "stamp": bool(b.get("stamp"))})
    t = end
total = t + TAIL
beats[-1]["end"] = round(total, 3)
json.dump({"beats": beats, "seconds": round(total, 3)}, open(os.path.join(out, "timeline.json"), "w"), indent=1)

# Mix.
n = int(total * SR) + SR
mix = np.zeros(n)
for b, vo in zip(beats, voices):
    s = int(b["voice"] * SR); mix[s:s + len(vo)] += vo * 0.95

def tone(f0, f1, dur, amp, decay):
    tt = np.arange(int(dur * SR)) / SR
    f = np.linspace(f0, f1, len(tt))
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * decay)

pop = tone(1400, 700, 0.07, 0.16, 60)
thud = tone(140, 55, 0.35, 0.5, 14)
for b in beats:
    for c in b["chunks"]:
        s = int(c["t"] * SR); mix[s:s + len(pop)] += pop
    if b["stamp"]:
        s = int((b["voice"] + 0.25) * SR); mix[s:s + len(thud)] += thud

# Music bed: Am - F - C - G, soft pad plus a light plucked arpeggio at 112 bpm.
bpm, chords = 112, [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
beat_s = 60 / bpm
bed = np.zeros(n)
tt = np.arange(n) / SR
bar = beat_s * 4
for k in range(int(total / bar) + 2):
    ch = chords[k % 4]
    s, e = int(k * bar * SR), min(n, int((k + 1) * bar * SR))
    seg = tt[s:e] - k * bar
    env = np.minimum(1, seg / 0.4) * np.minimum(1, (bar - seg) / 0.3)
    for m in ch:
        bed[s:e] += 0.018 * env * (np.sin(2 * np.pi * hz(m - 12) * seg) + 0.4 * np.sin(2 * np.pi * hz(m) * seg))
    for j in range(8):
        m = ch[j % 3] + (12 if j % 4 == 3 else 0)
        ps = int((k * bar + j * beat_s / 2) * SR)
        ln = int(0.32 * SR)
        if ps + ln > n: continue
        st = np.arange(ln) / SR
        bed[ps:ps + ln] += 0.03 * np.sin(2 * np.pi * hz(m + 12) * st) * np.exp(-st * 9)
    for j in range(4):
        ps = int((k * bar + j * beat_s) * SR); ln = int(0.18 * SR)
        if ps + ln > n: continue
        st = np.arange(ln) / SR
        bed[ps:ps + ln] += 0.05 * np.sin(2 * np.pi * (60 + 40 * np.exp(-st * 30)) * st) * np.exp(-st * 22)
fade = np.minimum(1, tt / 1.0) * np.minimum(1, np.maximum(0, (total - tt)) / 1.2)
mix += bed * fade * float(os.environ.get("MUSIC", "1"))
mix = mix[: int(total * SR)]
peak = np.max(np.abs(mix)) or 1
mix = mix / max(1, peak / 0.95)
with wave.open(os.path.join(out, "audio.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"{len(beats)} beats, {total:.1f}s, voice={'yes' if model != 'none' else 'no'}")
