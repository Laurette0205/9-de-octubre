#!/usr/bin/env python
"""Genera la playlist de ejemplo (audio original, sin licencias de terceros).

Crea en public/assets/audio/:
  main-theme.wav  progresión suave (Am · F · C · G) con pad y arpegio.
  starlight.wav   variación más lenta, ambiente nocturno.

Uso:
    python scripts/generate_audio.py
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "assets" / "audio"

SAMPLE_RATE = 22050
CHORD_SECONDS = 3.0
FADE_SECONDS = 0.35

NOTE_FREQUENCIES = {
    "A2": 110.00, "B2": 123.47, "C3": 130.81, "D3": 146.83, "E3": 164.81,
    "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94, "C4": 261.63,
    "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00,
    "B4": 493.88, "C5": 523.25, "E5": 659.25, "G5": 783.99,
}

NOTE_FREQUENCIES.setdefault("F2", 87.31)
NOTE_FREQUENCIES.setdefault("G2", 98.00)
NOTE_FREQUENCIES.setdefault("D5", 587.33)

PROGRESSION = [
    (["A2", "A3", "C4", "E4"], ["A4", "C5", "E5", "C5"]),
    (["F2", "F3", "A3", "C4"], ["C5", "A4", "F4", "A4"]),
    (["C3", "C4", "E4", "G4"], ["E5", "G5", "C5", "G5"]),
    (["G3", "B3", "D4", "G4"], ["D5", "G4", "B4", "D4"]),
]

STARLIGHT_PROGRESSION = [
    (["D3", "D4", "F3", "A3"], ["D5", "A4", "F4", "A4"]),
    (["B2", "B3", "D4", "F4"], ["B4", "D5", "F4", "D5"]),
    (["G2", "G3", "B3", "D4"], ["G4", "B4", "D5", "B4"]),
    (["A2", "A3", "C4", "E4"], ["A4", "E4", "C5", "E4"]),
]

TRACKS = [
    ("main-theme.wav", PROGRESSION, 3.0),
    ("starlight.wav", STARLIGHT_PROGRESSION, 3.6),
]


def tone(frequency: float, seconds: float, phase: float = 0.0) -> float:
    """Seno suave con armónicos discretos y envolvente tipo pad."""
    samples = int(SAMPLE_RATE * seconds)
    value = 0.0
    for index in range(samples):
        t = index / SAMPLE_RATE
        attack = min(1.0, t / 0.25)
        release = min(1.0, (seconds - t) / 0.45)
        envelope = max(0.0, attack * release)
        wave_value = (
            math.sin(2 * math.pi * frequency * t + phase)
            + 0.35 * math.sin(2 * math.pi * frequency * 2 * t)
            + 0.12 * math.sin(2 * math.pi * frequency * 3 * t)
        )
        value += wave_value * envelope
    return value


def arpeggio_note(frequency: float, seconds: float) -> list[float]:
    samples = int(SAMPLE_RATE * seconds)
    output = []
    for index in range(samples):
        t = index / SAMPLE_RATE
        envelope = math.exp(-t * 7.5) * min(1.0, t / 0.008)
        value = math.sin(2 * math.pi * frequency * t) + 0.2 * math.sin(2 * math.pi * frequency * 2 * t)
        output.append(value * envelope)
    return output


def build_track(progression, chord_seconds: float) -> list[float]:
    CHORD_SECONDS = chord_seconds
    chord_samples = int(SAMPLE_RATE * CHORD_SECONDS)
    total = chord_samples * len(PROGRESSION)
    mix = [0.0] * total

    for position, (pad_notes, arp_notes) in enumerate(progression):
        start = position * chord_samples

        for note in pad_notes:
            frequency = NOTE_FREQUENCIES[note]
            buffer = []
            samples = int(SAMPLE_RATE * CHORD_SECONDS)
            for index in range(samples):
                t = index / SAMPLE_RATE
                attack = min(1.0, t / 0.5)
                release = min(1.0, (CHORD_SECONDS - t) / 0.6)
                envelope = max(0.0, attack * release)
                detune = 1.003 if index % 2 else 1.0
                value = math.sin(2 * math.pi * frequency * detune * t)
                value += 0.28 * math.sin(2 * math.pi * frequency * 2 * t)
                buffer.append(value * envelope * 0.16)
            for offset, sample in enumerate(buffer):
                mix[start + offset] += sample

        step = SAMPLE_RATE * CHORD_SECONDS / len(arp_notes)
        for arp_index, note in enumerate(arp_notes):
            frequency = NOTE_FREQUENCIES[note]
            note_samples = int(SAMPLE_RATE * (CHORD_SECONDS / len(arp_notes)) * 0.9)
            buffer = arpeggio_note(frequency, note_samples / SAMPLE_RATE)
            offset_start = start + int(arp_index * step)
            for offset, sample in enumerate(buffer):
                index = offset_start + offset
                if index < total:
                    mix[index] += sample * 0.09

    fade = int(SAMPLE_RATE * FADE_SECONDS)
    for index in range(fade):
        factor = index / fade
        mix[index] *= factor
        mix[total - 1 - index] *= factor

    peak = max(abs(sample) for sample in mix) or 1.0
    return [sample / peak * 0.62 for sample in mix]


def write_track(path: Path, samples: list[float]) -> None:
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        frames = b"".join(struct.pack("<h", int(sample * 32767)) for sample in samples)
        handle.writeframes(frames)


def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for filename, progression, chord_seconds in TRACKS:
        target = AUDIO_DIR / filename
        samples = build_track(progression, chord_seconds)
        write_track(target, samples)
        size_kb = target.stat().st_size / 1024
        print(f"ok {target.relative_to(ROOT)} ({size_kb:.0f} KB, {len(samples) / SAMPLE_RATE:.1f}s)")


if __name__ == "__main__":
    main()
