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
COACH = ep.get("format") == "coach"
# Coach mode is a quick-fire argument: tighter gaps and no silent lead-in, so the first yell lands at once.
GAP, LEAD, TAIL = (0.06, 0.04, 0.5) if COACH else (0.22, 0.25, 0.6)
# One voice per character (25 Nov). Kokoro voice names; variables override.
CAST = {"coach": os.environ.get("COACH_VOICE", "am_michael"), "theo": os.environ.get("THEO_VOICE_LINE", "am_puck"),
        "dev": os.environ.get("DEV_VOICE", "am_fenrir"), "maya": os.environ.get("MAYA_VOICE", "af_bella")}

def spoken(text):
    # Say figures the way a person would, so the voice doesn't read symbols.
    t = text.replace("401(k)", "four oh one k").replace("50/30/20", "fifty thirty twenty")
    t = re.sub(r"([£$])([\d,]+)\.(\d\d)\b", lambda m: f"{m.group(2)} {'pounds' if m.group(1) == '£' else 'dollars'} and {int(m.group(3))} {'pence' if m.group(1) == '£' else 'cents'}", t)
    t = re.sub(r"£([\d,]+)", r"\1 pounds", t)
    t = re.sub(r"\$([\d,]+)", r"\1 dollars", t)
    t = re.sub(r"/MO\b", " a month", t)
    t = t.replace("%", " percent")
    return re.sub(r"\s+", " ", t).strip()

voices = []
def to_sr(data, rate):
    nz = np.where(np.abs(data) > 0.02)[0]
    if len(nz): data = data[max(0, nz[0] - int(0.02 * rate)): nz[-1] + int(0.05 * rate)]
    idx = np.linspace(0, len(data) - 1, int(len(data) * SR / rate))
    return np.interp(idx, np.arange(len(data)), data)

if model.startswith("kokoro:"):
    # kokoro:<dir>:<voice>  e.g. kokoro:/tmp/kokoro:af_heart  (af/am = American, bf/bm = British)
    _, kdir, kvoice = model.split(":", 2)
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(kdir, "kokoro-v1.0.onnx"), os.path.join(kdir, "voices-v1.0.bin"))
    lang = "en-gb" if kvoice.startswith("b") else "en-us"
    # Words spelt alike but said differently. The voice guesses from the word
    # alone, so "lives with two roommates" came out as "nine lives". Each rule
    # matches the word in a context and gives the sound to use; {word|sound}
    # in a script forces a sound by hand.
    FIXES = [
        (r"\b(?P<w>lives)\s+(with|in|at|on|alone|off|by|near|paycheck|together|here|there)\b", "lˈɪvz"),
        (r"\b(?P<w>live)\s+(with|in|at|on|alone|off|by|near|paycheck|together|here|there)\b", "lˈɪv"),
        (r"\b(to|will|can|could|should|would|must|may|might|i|we|you|they)\s+(?P<w>read)\b", "ɹˈiːd"),
        (r"\b(has|have|had|was|were|been|already|just)\s+(?P<w>read)\b", "ɹˈɛd"),
        (r"\b(?P<w>minute)\s+(details?|amounts?|changes?)\b", "maɪnjˈuːt"),
    ]
    def phon(text):
        marks = []
        def keep(m):
            marks.append(m.group(2)); return f" \u2063{len(marks) - 1}\u2063 "
        t = re.sub(r"\{([^|}]+)\|([^}]+)\}", keep, text)
        for rx, ipa in FIXES:
            def swap(m, ipa=ipa):
                marks.append(ipa)
                a, b = m.span("w"); s0 = m.start()
                g = m.group(0)
                return g[: a - s0] + f" \u2063{len(marks) - 1}\u2063 " + g[b - s0:]
            t = re.sub(rx, swap, t, flags=re.I)
        out = []
        for part in re.split(r"\s*\u2063(\d+)\u2063\s*", t):
            if part.isdigit(): out.append(marks[int(part)])
            elif part.strip(): out.append(k.tokenizer.phonemize(part.strip(), lang))
        return " ".join(out)
    def yell(v):
        # A yelled line: pitched up about a semitone (by resampling, which also quickens it),
        # driven hard into a soft clipper for grit, then levelled.
        idx = np.arange(0, len(v) - 1, 1.07)
        v = np.interp(idx, np.arange(len(v)), v)
        v = np.tanh(v / (np.max(np.abs(v)) or 1) * 3.2)
        return v / (np.max(np.abs(v)) or 1) * 0.98
    for b in ep["beats"]:
        vname = CAST.get(b.get("who"), kvoice) if COACH else kvoice
        vlang = "en-gb" if vname.startswith("b") else "en-us"
        loud = COACH and b.get("loud")
        sp = float(os.environ.get("SPEED", "1.08")) * (1.06 if loud else 1.0) * (1.12 if COACH else 1.0)
        a, rate = k.create(phon(spoken(b["say"])) if vlang == lang else k.tokenizer.phonemize(spoken(b["say"]), vlang), voice=vname, speed=sp, lang=vlang, is_phonemes=True)
        v = to_sr(np.asarray(a, dtype=np.float32), rate)
        if COACH: v = yell(v) if loud else v / (np.max(np.abs(v)) or 1) * 0.8
        voices.append(v)
    model = "kokoro"
elif model != "none" and os.path.exists(model):
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


# Captions follow the words actually spoken (20 Nov: captions written separately
# from the narration read as a different sentence). The line is cut into chunks
# of up to three words, breaking at punctuation; figures and the words starred
# in the beat's `cap` are highlighted.
def speech_chunks(b):
    norm = lambda w: re.sub(r"[^A-Z0-9$%.]", "", w.upper()).rstrip(".")
    stars = set()
    for m in re.findall(r"\*([^*]+)\*", b.get("cap", "")):
        stars.update(norm(w) for w in m.split() if norm(w))
    def mark(w):
        n = norm(w)
        bare = re.sub(r"[.,!?:;]+$", "", w).upper()
        letter_ok = len(n) > 1 or re.search(r"[,.]$", w)   # "A," the vote letter, not the article "a"
        if re.search(r"[$£%]|\d", w) or (n and n in stars and letter_ok):
            m = re.match(r"^([^A-Za-z0-9$£]*)(.*?)([^A-Za-z0-9%]*)$", bare)
            if m and m.group(2):
                return f"{m.group(1)}*{m.group(2)}*{m.group(3)}"
        return bare
    # Phrases end at punctuation; each phrase is cut into even chunks of at most
    # three words, so no word is left on its own at the end of a phrase.
    phrases, cur = [], []
    for w in b["say"].split():
        cur.append(w)
        if re.search(r"[.,!?:;]$", w):
            phrases.append(cur); cur = []
    if cur: phrases.append(cur)
    out = []
    for ph in phrases:
        n = len(ph); letters = len(re.sub(r"[^A-Za-z0-9]", "", "".join(ph)))
        k = min(n, max(1, -(-n // 3), -(-letters // 15)))
        sizes = [n // k + (1 if i < n % k else 0) for i in range(k)]
        i = 0
        for sz in sizes:
            out.append(" ".join(mark(w) for w in ph[i:i + sz])); i += sz
    # Glue a lone one-word chunk (other than a vote letter) onto the one before.
    merged = []
    for c in out:
        if merged and len(c.split()) == 1 and not re.fullmatch(r"\*?[AB]\*?", c) and len(re.sub(r"[^A-Za-z0-9]", "", merged[-1] + c)) <= 16:
            merged[-1] += " " + c
        else:
            merged.append(c)
    return merged or [b.get("cap", "")]

# Timeline: beats end to end; caption chunks spread over the spoken line by length.
beats, t = [], LEAD
for b, vo in zip(ep["beats"], voices):
    dur = len(vo) / SR
    chunks = speech_chunks(b)
    weights = [max(3, len(re.sub(r"[^A-Za-z0-9£%]", "", c))) for c in chunks]
    acc, ch = 0, []
    for c, wgt in zip(chunks, weights):
        ch.append({"t": round(t + dur * acc / sum(weights) * 0.92, 3), "text": c})
        acc += wgt
    end = t + dur + GAP + (0.9 if b.get("scene") in ("vote",) else 0)
    beats.append({"start": round(t - (LEAD if not beats else 0), 3), "voice": round(t, 3), "vend": round(t + dur, 3), "end": round(end, 3), "chunks": ch,
                  "stamp": bool(b.get("stamp")), "who": b.get("who"), "loud": bool(COACH and b.get("loud"))})
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

pop = tone(1400, 700, 0.07, 0.16 if not COACH else 0.08, 60)
rng = np.random.default_rng(7)
def whoosh(dur=0.22, amp=0.14):
    # Filtered noise swelling and falling: the cut sound between lines.
    nn = int(dur * SR); x = rng.standard_normal(nn)
    x = np.convolve(x, np.ones(18) / 18, mode="same")
    env = np.sin(np.linspace(0, np.pi, nn)) ** 2
    return amp * x * env
def boom():
    # The hit under a yelled line: a sub drop plus a short noise crack.
    b0 = tone(110, 38, 0.6, 0.75, 7)
    cr = rng.standard_normal(int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 70) * 0.25
    b0[:len(cr)] += cr
    return b0
thud = tone(140, 55, 0.35, 0.5, 14)
for b in beats:
    for c in b["chunks"]:
        s = int(c["t"] * SR); mix[s:s + len(pop)] += pop
    if b["stamp"]:
        s = int((b["voice"] + 0.25) * SR); mix[s:s + len(thud)] += thud
    if COACH:
        w = whoosh(); s = max(0, int((b["start"] - 0.08) * SR)); mix[s:s + len(w)] += w[: len(mix) - s]
        if b["loud"]:
            bm = boom(); s = max(0, int((b["voice"] - 0.02) * SR)); mix[s:s + len(bm)] += bm[: len(mix) - s]

# Music bed: Am - F - C - G, soft pad plus a light plucked arpeggio at 112 bpm.
bpm, chords = (126 if COACH else 112), [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
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
fade = np.minimum(1, tt / (0.15 if COACH else 1.0)) * np.minimum(1, np.maximum(0, (total - tt)) / 1.2)
if COACH:
    duck = np.ones(n)
    for b in beats:
        if b["loud"]:
            s0, e0 = int(b["voice"] * SR), int(b["vend"] * SR); duck[s0:e0] = 0.35
    fade = fade * np.convolve(duck, np.ones(2400) / 2400, mode="same")
mix += bed * fade * float(os.environ.get("MUSIC", "1"))
mix = mix[: int(total * SR)]
peak = np.max(np.abs(mix)) or 1
mix = mix / max(1, peak / 0.95)
with wave.open(os.path.join(out, "audio.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"{len(beats)} beats, {total:.1f}s, voice={'yes' if model != 'none' else 'no'}")
