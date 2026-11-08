/* ==========================================================================
   Kit definition + lesson library
   Patterns are written one bar = 16 characters (16th notes):
       "x" = hit,  "-" = rest
   Counting for one bar:  1 e & a 2 e & a 3 e & a 4 e & a
   ========================================================================== */

const KIT = [
  { id: "crash", key: "w", name: "Crash",     img: "images/crash.png", color: "#facc15", hand: "L" },
  { id: "kick",  key: "a", name: "Kick",      img: "images/kick.png",  color: "#f43f5e", hand: "L" },
  { id: "snare", key: "s", name: "Snare",     img: "images/snare.png", color: "#e5e7eb", hand: "L" },
  { id: "tom1",  key: "d", name: "High Tom",  img: "images/tom1.png",  color: "#4ade80", hand: "L" },
  { id: "hihat", key: "h", name: "Hi-Hat",    img: "images/hihat.svg", color: "#67e8f9", hand: "R" },
  { id: "tom2",  key: "j", name: "Mid Tom",   img: "images/tom2.png",  color: "#a78bfa", hand: "R" },
  { id: "tom3",  key: "k", name: "Low Tom",   img: "images/tom3.png",  color: "#f472b6", hand: "R" },
  { id: "tom4",  key: "l", name: "Floor Tom", img: "images/tom4.png",  color: "#fb923c", hand: "R" },
];

/** Top-to-bottom order used on drum charts: cymbals on top, kick at the bottom. */
const CHART_ORDER = ["crash", "hihat", "tom1", "tom2", "tom3", "snare", "tom4", "kick"].map((id) => KIT.find((k) => k.id === id));

const COUNT_16 = ["1", "e", "&", "a", "2", "e", "&", "a", "3", "e", "&", "a", "4", "e", "&", "a"];

const LESSONS = [
  {
    id: "pulse",
    title: "Steady Pulse",
    level: "Beginner",
    bpm: 70,
    summary: "Before any groove: lock in with the click. Hit the hi-hat exactly on every beat.",
    pattern: { hihat: "x---x---x---x---" },
    count: "1  2  3  4",
    how: [
      "Rest your right index finger on H (hi-hat).",
      "Turn on the metronome and just listen for one bar, counting “1, 2, 3, 4” out loud.",
      "Press H exactly on each number — try to make your hit and the click sound like one sound.",
      "Keep it going for a full minute without speeding up or slowing down.",
    ],
    tip: "If you hear two separate sounds (click + hat), you’re early or late. Aim to ‘bury’ the click.",
  },
  {
    id: "eighths",
    title: "Eighth-Note Hi-Hat",
    level: "Beginner",
    bpm: 70,
    summary: "Double the pulse: two even hi-hat hits per beat. This is the engine of almost every rock and pop beat.",
    pattern: { hihat: "x-x-x-x-x-x-x-x-" },
    count: "1 & 2 & 3 & 4 &",
    how: [
      "Count “1 & 2 & 3 & 4 &” — say “and” exactly halfway between the numbers.",
      "Press H on every syllable — 8 hits per bar.",
      "Keep every hit the same distance apart. Numbers and “&”s must be perfectly even.",
    ],
    tip: "Tap your foot on the numbers only. Your finger plays twice per foot tap.",
  },
  {
    id: "backbeat",
    title: "The Backbeat",
    level: "Beginner",
    bpm: 75,
    summary: "Kick on 1 and 3, snare on 2 and 4. The ‘boom–clap’ under nearly all popular music.",
    pattern: { kick: "x-------x-------", snare: "----x-------x---" },
    count: "1  2  3  4",
    how: [
      "Left pinky on A (kick), left ring finger on S (snare).",
      "On “1” press A. On “2” press S. On “3” press A. On “4” press S.",
      "Say it while you play: “BOOM – CLAP – BOOM – CLAP”.",
      "Loop it until you don’t have to think about which key comes next.",
    ],
    tip: "The snare on 2 and 4 is called the backbeat — make it the loudest, most confident part.",
  },
  {
    id: "rock",
    title: "Basic Rock Beat",
    level: "Beginner",
    bpm: 80,
    summary: "The #1 drum beat to learn. Hi-hat eighths on top, kick on 1 & 3, snare on 2 & 4.",
    pattern: {
      hihat: "x-x-x-x-x-x-x-x-",
      snare: "----x-------x---",
      kick:  "x-------x-------",
    },
    count: "1 & 2 & 3 & 4 &",
    how: [
      "Start with only the hi-hat (H) playing eighth notes: “1 & 2 & 3 & 4 &”.",
      "Add the kick (A) together with the hi-hat on “1” and “3” — press both keys at the same instant.",
      "Add the snare (S) together with the hi-hat on “2” and “4”.",
      "On the “&”s only the hi-hat plays. Every number has the hat PLUS kick or snare.",
    ],
    tip: "Practise at 60 BPM first. When it feels boring, it’s ready to speed up.",
  },
  {
    id: "rock-kick",
    title: "Rock Beat + Extra Kick",
    level: "Beginner",
    bpm: 85,
    summary: "Add a kick on the ‘&’ of 2. One extra note makes the beat bounce forward.",
    pattern: {
      hihat: "x-x-x-x-x-x-x-x-",
      snare: "----x-------x---",
      kick:  "x-----x-x-------",
    },
    count: "1 & 2 & 3 & 4 &",
    how: [
      "Play the Basic Rock Beat first.",
      "Find the “&” after 2 — that hi-hat now also gets a kick (A + H together).",
      "So the kick pattern is: “1 … 2-& 3”. Two kicks in a row: “& 3”.",
      "Keep the snare on 2 and 4 exactly where it was.",
    ],
    tip: "Say the kicks out loud: “ONE … and-THREE”. Get the rhythm in your mouth before your fingers.",
  },
  {
    id: "four-floor",
    title: "Four on the Floor",
    level: "Beginner",
    bpm: 110,
    summary: "Disco / dance / house groove: kick on every beat, hi-hat on the off-beats.",
    pattern: {
      hihat: "--x---x---x---x-",
      snare: "----x-------x---",
      kick:  "x---x---x---x---",
    },
    count: "1 & 2 & 3 & 4 &",
    how: [
      "Kick (A) on every number: 1, 2, 3, 4.",
      "Hi-hat (H) only on the “&”s — in between the kicks. Think ‘boom-tss-boom-tss’.",
      "Add snare (S) with the kick on 2 and 4.",
      "The hi-hat should never land at the same time as the kick.",
    ],
    tip: "Off-beat hats are tricky at first. Play kick + hat alone until it ‘pumps’, then add snare.",
  },
  {
    id: "halftime",
    title: "Half-Time Groove",
    level: "Intermediate",
    bpm: 90,
    summary: "Snare moves to beat 3 only. Same tempo, but the groove feels twice as slow and heavy.",
    pattern: {
      hihat: "x-x-x-x-x-x-x-x-",
      snare: "--------x-------",
      kick:  "x---------x-----",
    },
    count: "1 & 2 & 3 & 4 &",
    how: [
      "Hi-hat eighths stay the same as the rock beat.",
      "Kick (A) on “1” and on the “&” of 3.",
      "Snare (S) only ONCE per bar — on “3”.",
      "Let the space breathe; don’t fill the gaps.",
    ],
    tip: "Used in ballads and heavy breakdowns. Make the single snare hit big.",
  },
  {
    id: "sixteenths",
    title: "16th-Note Hi-Hat Groove",
    level: "Intermediate",
    bpm: 65,
    summary: "Four hi-hats per beat. Builds speed and even subdivisions.",
    pattern: {
      hihat: "xxxxxxxxxxxxxxxx",
      snare: "----x-------x---",
      kick:  "x-------x-x-----",
    },
    count: "1 e & a 2 e & a 3 e & a 4 e & a",
    how: [
      "Count “1 e & a 2 e & a …” — four even syllables per beat.",
      "Hi-hat on every syllable. Use two fingers on H, alternating (R-L-R-L) to keep it relaxed.",
      "Kick on “1”, “3” and the “&” of 3. Snare on “2” and “4”.",
      "Start very slow (50 BPM). Speed comes from staying relaxed, not from pushing.",
    ],
    tip: "Alternating two fingers on one key is just like alternating sticks — drummers call it single strokes.",
  },
  {
    id: "funk",
    title: "Syncopated Funk",
    level: "Advanced",
    bpm: 90,
    summary: "Kicks on the ‘a’ and ‘&’ plus a pickup snare. Pushes against the beat — that’s syncopation.",
    pattern: {
      hihat: "x-x-x-x-x-x-x-x-",
      snare: "----x-------x--x",
      kick:  "x--x------x-----",
    },
    count: "1 e & a 2 e & a 3 e & a 4 e & a",
    how: [
      "Count in 16ths: “1 e & a 2 e & a …”.",
      "Kick on “1”, the “a” of 1 (just before 2), and the “&” of 3.",
      "Snare on “2”, “4”, and the “a” of 4 — a quick pickup leading back to “1”.",
      "The kick on “a” of 1 has NO hi-hat with it — it lands between hats.",
    ],
    tip: "Loop just beat 1 (“1 e & a 2”) until the kick-kick feels natural, then add the rest.",
  },
  {
    id: "tom-fill",
    title: "Down-the-Kit Tom Fill",
    level: "Intermediate",
    bpm: 75,
    summary: "A classic fill: 16th notes travelling from snare, around the toms, down to the floor tom.",
    pattern: {
      snare: "xxxx------------",
      tom1:  "----xxxx--------",
      tom2:  "--------xxxx----",
      tom3:  "------------xx--",
      tom4:  "--------------xx",
    },
    count: "1 e & a 2 e & a 3 e & a 4 e & a",
    how: [
      "Beat 1: four snare hits (S).   Beat 2: four high-tom hits (D).",
      "Beat 3: four mid-tom hits (J).   Beat 4: two low tom (K) then two floor tom (L).",
      "Every note is evenly spaced — same speed all the way down. Don’t rush the toms.",
      "Your hands travel left → right across the keyboard, just like moving across a real kit.",
    ],
    tip: "Fills usually end with a crash + kick on the next “1”. Try adding W + A after the loop.",
  },
  {
    id: "groove-fill",
    title: "Groove + Fill (2 bars)",
    level: "Advanced",
    bpm: 80,
    summary: "Put it together: a crash, one bar of rock beat, then a half-bar fill back into the crash.",
    pattern: {
      crash: "x---------------" + "----------------",
      hihat: "--x-x-x-x-x-x-x-" + "x-x-x-x---------",
      snare: "----x-------x---" + "----x---xx------",
      kick:  "x-------x-------" + "x---------------",
      tom1:  "----------------" + "----------xx----",
      tom2:  "----------------" + "------------xx--",
      tom4:  "----------------" + "--------------xx",
    },
    count: "1 e & a 2 e & a 3 e & a 4 e & a  (×2)",
    how: [
      "Bar 1 starts with Crash + Kick together (W + A) instead of hi-hat on “1”.",
      "Then a normal rock beat for the rest of bar 1.",
      "Bar 2: rock beat for beats 1–2, then on beat 3 the fill starts: S S D D J J L L as 16ths.",
      "The fill ends and you land on Crash + Kick at the top again — that landing is the most important note.",
    ],
    tip: "Drummers judge a fill by how cleanly you land on the next ‘1’. Never be late coming out of a fill.",
  },
  {
    id: "floor-groove",
    title: "Floor Tom Groove",
    level: "Intermediate",
    bpm: 95,
    summary: "Swap the hi-hat for the floor tom to get a big, tribal sound.",
    pattern: {
      tom4:  "x-x-x-x-x-x-x-x-",
      snare: "----x-------x---",
      kick:  "x-------x-x-----",
    },
    count: "1 & 2 & 3 & 4 &",
    how: [
      "Play the rock beat, but move your hi-hat hand onto L (floor tom).",
      "Floor tom eighths, snare on 2 and 4, kick on 1, 3 and the “&” of 3.",
      "Keep the floor tom quieter than the snare in your head — the backbeat still leads.",
    ],
    tip: "This is a great ‘build-up’ groove before a chorus. Switch back to the hi-hat to drop in.",
  },
];

/** Convert a lesson's string pattern into { instId: boolean[] } of length steps. */
function parsePattern(pat) {
  const len = Math.max(...Object.values(pat).map((s) => s.length));
  const out = {};
  KIT.forEach((k) => {
    const s = pat[k.id] || "";
    out[k.id] = Array.from({ length: len }, (_, i) => s[i] === "x");
  });
  return { steps: len, grid: out };
}
