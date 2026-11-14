#!/usr/bin/env python3
"""Generate original ambient demo loops for 声屿.

The audio is fully synthesized (no third-party recordings). Eight 45-second
loops are written as MP3 into apps/api/media/audio. Deterministic output.
"""
from __future__ import annotations

import math
import os
import random
import struct
import subprocess
import tempfile
import wave

SR = 22050
DURATION = 45.0
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "apps", "api", "media", "audio")

PRESETS = [
    # name, root midi, chord intervals (semitones), bpm, brightness, noise
    ("dawn", 60, [(0, 4, 7, 11), (2, 5, 9, 12), (0, 4, 9, 12), (5, 9, 12, 16)], 66, 0.55, 0.015),
    ("tide", 57, [(0, 3, 7, 10), (5, 8, 12, 15), (3, 7, 10, 14), (0, 5, 7, 12)], 60, 0.40, 0.030),
    ("dusk", 55, [(0, 3, 7, 10), (7, 10, 14, 17), (5, 8, 12, 15), (3, 7, 10, 14)], 72, 0.35, 0.020),
    ("ember", 53, [(0, 4, 7, 11), (7, 11, 14, 18), (9, 12, 16, 19), (5, 9, 12, 16)], 68, 0.50, 0.018),
    ("rain", 52, [(0, 3, 7, 10), (3, 7, 10, 14), (5, 8, 12, 15), (0, 3, 10, 12)], 58, 0.30, 0.045),
    ("orbit", 59, [(0, 4, 7, 11), (5, 9, 12, 16), (7, 11, 14, 18), (2, 6, 9, 14)], 76, 0.62, 0.012),
    ("moss", 50, [(0, 4, 7, 11), (2, 5, 9, 12), (5, 9, 12, 16), (0, 4, 9, 12)], 64, 0.28, 0.026),
    ("neon", 56, [(0, 3, 7, 10), (8, 12, 15, 19), (5, 8, 12, 15), (3, 7, 10, 15)], 80, 0.70, 0.010),
]


def midi_hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def synth(seed_name: str, root: int, chords: list[tuple[int, ...]], bpm: float,
          bright: float, noise_amt: float) -> list[float]:
    rng = random.Random(seed_name)
    n = int(SR * DURATION)
    buf = [0.0] * n
    beat = 60.0 / bpm
    bar = beat * 4
    scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]

    # Slow evolving pad, one chord per bar.
    for bar_i in range(int(DURATION / bar) + 1):
        chord = chords[bar_i % len(chords)]
        start = int(bar_i * bar * SR)
        length = int(bar * SR * 1.15)
        for interval in chord:
            freq = midi_hz(root + interval - 12)
            detune = 1.0 + rng.uniform(-0.0015, 0.0015)
            amp = 0.055 * (0.6 + 0.4 * bright)
            phase = rng.uniform(0, math.tau)
            for k in range(length):
                idx = start + k
                if idx >= n:
                    break
                t = k / SR
                env = min(1.0, t / 1.8) * min(1.0, (length - k) / (SR * 2.2))
                lfo = 0.75 + 0.25 * math.sin(math.tau * 0.09 * t + phase)
                s = math.sin(math.tau * freq * detune * t + phase)
                s += 0.34 * math.sin(math.tau * freq * 2 * detune * t + phase * 0.5)
                s += 0.12 * math.sin(math.tau * freq * 3 * detune * t + phase * 1.3)
                buf[idx] += amp * env * lfo * s

    # Plucked arpeggio.
    step = beat / 2
    steps = int(DURATION / step)
    for i in range(steps):
        if rng.random() < 0.30:
            continue
        note = root + 12 + rng.choice(scale)
        if rng.random() < 0.25:
            note += 12
        freq = midi_hz(note)
        start = int(i * step * SR) + int(rng.uniform(0, 0.02) * SR)
        length = int(1.4 * SR)
        amp = 0.07 * (0.5 + 0.5 * bright) * rng.uniform(0.5, 1.0)
        for k in range(length):
            idx = start + k
            if idx >= n:
                break
            t = k / SR
            env = math.exp(-3.4 * t)
            s = math.sin(math.tau * freq * t) + 0.25 * math.sin(math.tau * freq * 2.01 * t)
            buf[idx] += amp * env * s

    # Sub bass on beats 1 and 3.
    for i in range(int(DURATION / (beat * 2))):
        start = int(i * beat * 2 * SR)
        freq = midi_hz(root - 24 + (0 if i % 2 == 0 else 5))
        length = int(beat * 1.6 * SR)
        for k in range(length):
            idx = start + k
            if idx >= n:
                break
            t = k / SR
            env = min(1.0, t / 0.08) * math.exp(-1.7 * t)
            buf[idx] += 0.16 * env * math.sin(math.tau * freq * t)

    # Soft heartbeat kick.
    for i in range(int(DURATION / (beat * 2))):
        start = int(i * beat * 2 * SR)
        length = int(0.5 * SR)
        for k in range(length):
            idx = start + k
            if idx >= n:
                break
            t = k / SR
            freq = 72 * math.exp(-7.0 * t) + 38
            env = math.exp(-9.0 * t)
            buf[idx] += 0.13 * env * math.sin(math.tau * freq * t)

    # Air / vinyl noise.
    low = 0.0
    for i in range(n):
        white = rng.uniform(-1, 1)
        low += 0.04 * (white - low)
        buf[i] += noise_amt * (white - low) * (0.6 + 0.4 * math.sin(math.tau * 0.05 * i / SR))

    # Fade in / out and soft clip.
    fade = int(SR * 1.2)
    peak = 0.0
    for i in range(n):
        env = 1.0
        if i < fade:
            env *= i / fade
        if i > n - fade:
            env *= (n - i) / fade
        # gentle saturation
        x = math.tanh(buf[i] * 1.15) * env
        buf[i] = x
        peak = max(peak, abs(x))

    norm = 0.82 / peak if peak > 0 else 1.0
    return [x * norm for x in buf]


def write_mp3(samples: list[float], out_path: str) -> None:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray()
        for x in samples:
            frames += struct.pack("<h", int(max(-1.0, min(1.0, x)) * 32000))
        wf.writeframes(bytes(frames))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
         "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", str(SR), out_path],
        check=True,
    )
    os.unlink(wav_path)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for i, (name, root, chords, bpm, bright, noise_amt) in enumerate(PRESETS, start=1):
        print(f"synthesizing loop-{i:02d} ({name})…", flush=True)
        samples = synth(name, root, chords, bpm, bright, noise_amt)
        write_mp3(samples, os.path.join(OUT_DIR, f"loop-{i:02d}.mp3"))
    print("done:", OUT_DIR)


if __name__ == "__main__":
    main()