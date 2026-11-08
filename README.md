# Drum Kit 🥁

Play drums with your keyboard, build beats in a step sequencer, and **learn real grooves** with a guided, scored practice mode. Pure HTML/CSS/JS, no build step. Open `index.html` and play.

## Features

### Play
- 8-piece kit: Crash, Kick, Snare, Hi-Hat and four Toms. Use the keyboard or click/tap the pads.
- Low-latency **Web Audio** engine: samples are decoded once and can overlap without cutting each other off.
- **Recorder**: record a performance, loop it back, or **quantise it into the sequencer**.

### Sequencer
- 16 or 32 step grid. Click or drag to paint notes.
- Swing control, groove presets, and auto-save (localStorage).

### Learn (what to play and how)
- 12 lessons from *Steady Pulse* to *Syncopated Funk* and *Groove + Fill*.
- Each lesson has:
  - **Drum notation grid** with the count (`1 e & a 2 e & a…`) and the exact key for every note
  - Step-by-step **"How to play it"** instructions and a coach's tip
  - **Listen**: hear the groove with a moving playhead
  - **Practice**: notes scroll toward a hit line and every hit is judged *Perfect / Good / Early / Late / Miss*. You get accuracy, best streak, and your average timing offset (rushing or dragging) plus a personal best per lesson.
  - Tempo (60–115%), loop count and quiet guide sounds are adjustable

### Global
- Tempo (40–240 BPM), tap tempo, metronome with accented downbeat, master volume.

## Keys

| Left hand | | Right hand | |
|---|---|---|---|
| `W` | Crash | `H` | Hi-Hat |
| `A` | Kick | `J` | Mid Tom |
| `S` | Snare | `K` | Low Tom |
| `D` | High Tom | `L` | Floor Tom |

`Space` play/stop · `R` record · `M` metronome · `T` tap tempo · `Esc` stop

## Project structure

```
index.html
styles.css
js/sound-data.js   drum samples embedded as base64 (works from file://)
js/audio.js        Web Audio engine + synthesised hi-hat + metronome click
js/lessons.js      kit definition and lesson library (patterns as "x---x---" strings)
js/app.js          UI, look-ahead scheduler, sequencer, recorder, practice mode
sounds/ images/    original assets
```

**Adding a lesson:** append an object to `LESSONS` in `js/lessons.js`. Each instrument's pattern is a string with 16 characters per bar (`x` = hit, `-` = rest).

**Timing:** all playback runs on the AudioContext clock with a 25 ms look-ahead scheduler, so tempo stays steady even when the page is busy. Practice-mode judging compensates for output latency.
