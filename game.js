'use strict';

const get = (id) => document.getElementById(id);
const stage = get('stage');
const tapButton = get('tap');
const grade = get('grade');
const status = get('status');
const pen = get('pen');
const thumb = get('thumb');
const trail = get('trail');
const beatDot = get('beat-dot');
const trackFill = get('track-fill');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const startingPeriod = 800;
const endPeriod = 440;
const penRestAngle = -27;
const retryDelay = 430;
const storageKey = 'langsystems.penspin.v1';

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

const settings = readSettings();
let best = Number.isSafeInteger(settings.best) && settings.best > 0 ? settings.best : 0;
let soundOn = settings.sound === true;
let audio;

let state = 'ready';
let streak = 0;
let perfect = 0;
let record = false;
let previousBeat = 0;
let nextBeat = 0;
let period = startingPeriod;
let earlyWarning = false;
let inputAt = -Infinity;
let gradeUntil = 0;
let perfectAt = -Infinity;
let dropAt = 0;
let dropPose = { x: 0, y: 0, angle: penRestAngle };
let pose = dropPose;
let frame = null;

const displayNumber = (number) => String(number).padStart(2, '0');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ best, sound: soundOn }));
  } catch {
    // The run remains playable when the browser blocks storage.
  }
}

function showSound() {
  get('sound').setAttribute('aria-pressed', String(soundOn));
  get('sound-label').textContent = soundOn ? 'Sound on' : 'Sound off';
}

function unlockAudio() {
  if (!soundOn) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      audio ??= new Audio();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    }
  } catch {
    // Visual cues carry the full game if audio is unavailable.
  }
}

function note(frequency, start, duration, level, type = 'sine', endFrequency = frequency) {
  if (!soundOn || audio?.state !== 'running') return;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  const time = audio.currentTime + start;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
  volume.gain.setValueAtTime(.001, time);
  volume.gain.exponentialRampToValueAtTime(level, time + .008);
  volume.gain.exponentialRampToValueAtTime(.001, time + duration);
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + .01);
}

function texture(context, output, layers) {
  const now = context.currentTime;
  for (const [delay, duration, frequency, resonance, level] of layers) {
    const source = context.createBufferSource();
    const frames = Math.ceil(context.sampleRate * duration);
    source.buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = source.buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const attack = Math.min(1, i / (context.sampleRate * .0015));
      data[i] = (Math.random() * 2 - 1) * attack * (1 - i / frames) ** 2;
    }
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    const gain = context.createGain();
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(output);
    source.start(now + delay);
  }
}

function playHit(onTime) {
  if (soundOn && audio?.state === 'running') {
    texture(audio, audio.destination, [[0, .035, 1750, 1.8, .29]]);
  }
  note(630, 0, .055, .095, 'triangle', 290);
  if (onTime) {
    const notes = [392, 440, 493.88, 587.33, 659.25, 783.99];
    const pitch = notes[(streak - 1) % notes.length];
    note(pitch, .012, .16, .085);
    note(pitch * 1.5, .042, .19, .055);
  }
}

function setState(value, action, label) {
  state = value;
  stage.dataset.state = value;
  stage.dataset.window = 'false';
  get('action-label').textContent = action;
  tapButton.setAttribute('aria-label', label);
}

function drawScore() {
  get('streak').textContent = displayNumber(streak);
  get('best').textContent = displayNumber(best);
  get('tempo').textContent = Math.round(60000 / period) + ' BPM';
  get('accuracy').textContent = streak ? Math.round(100 * perfect / streak) + '% perfect' : 'Catch the diamond';
}

function setGrade(message, tone, now) {
  grade.textContent = message;
  grade.dataset.tone = tone;
  gradeUntil = now + 390;
}

function showResult(tag, title, detail) {
  get('result-tag').textContent = tag;
  get('result-title').textContent = title;
  get('result-detail').textContent = detail;
  get('result').hidden = false;
  status.textContent = title + ' ' + detail;
}

function begin(now, resume = false) {
  if (!resume) {
    streak = 0;
    perfect = 0;
    record = false;
    period = startingPeriod;
  }
  previousBeat = now;
  nextBeat = now + period;
  earlyWarning = false;
  inputAt = now;
  perfectAt = -Infinity;
  get('result').hidden = true;
  setState('playing', '', 'Tap on the beat');
  setGrade('Follow the dot', '', now);
  status.textContent = resume ? 'Run resumed.' : 'Run started.';
  drawScore();
  note(480, 0, .085, .085, 'triangle', 240);
  render(now);
}

function drop(now, reason) {
  dropAt = now;
  dropPose = pose;
  grade.textContent = '';
  setState('dropped', 'Try again', 'Try again');
  const count = streak === 1 ? '1 spin' : streak + ' spins';
  showResult(record ? 'NEW PERSONAL BEST' : 'THE RUN IS OVER', 'Pen dropped.', reason + ' · ' + count);
  if (soundOn && audio?.state === 'running') {
    texture(audio, audio.destination, [[.1, .07, 1150, 1.5, .52],
      [.2, .05, 1750, 1.2, .28], [.26, .035, 1600, 1.2, .17]]);
  }
  render(now);
}

function hitWindow() {
  return Math.round(140 - 54 * (startingPeriod - period) / (startingPeriod - endPeriod));
}

function tap(now) {
  unlockAudio();
  if (state === 'ready' || state === 'paused') {
    begin(now, state === 'paused');
    return;
  }
  if (state === 'dropped') {
    if (now - dropAt >= retryDelay) begin(now);
    return;
  }
  if (now - inputAt < 75) return;
  inputAt = now;

  const error = now - nextBeat;
  const windowSize = hitWindow();
  if (error > windowSize) {
    drop(now, 'Missed the beat');
    return;
  }
  if (error < -windowSize) {
    if (earlyWarning) {
      drop(now, 'Too many early taps');
      return;
    }
    earlyWarning = true;
    setGrade('Wait for the diamond', 'warning', now);
    note(154, 0, .07, .07, 'triangle', 119);
    return;
  }

  const onTime = Math.abs(error) <= Math.round(windowSize * .36);
  streak += 1;
  if (onTime) {
    perfect += 1;
    perfectAt = now;
  }
  if (streak > best) {
    best = streak;
    record = true;
    saveSettings();
  }
  earlyWarning = false;
  previousBeat = nextBeat;
  // Advance the beat grid, never the user's tap, so early/late hits do not move the target.
  period = Math.max(endPeriod, startingPeriod - Math.floor(streak / 5) * 30);
  nextBeat += period;
  const speedUp = streak % 5 === 0 && period > endPeriod;
  const judgement = onTime ? 'Perfect' : error < 0 ? 'Early' : 'Late';
  setGrade(speedUp ? judgement + ' · Faster' : judgement, onTime ? 'perfect' : '', now);
  drawScore();
  playHit(onTime);
}

function drawPen(x, y, angle) {
  pose = { x, y, angle };
  pen.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + angle + ')');
}

function drawSpin(now) {
  const phase = clamp((now - previousBeat) / period, -.35, 1.25);
  const angle = penRestAngle + 360 * phase;
  const radians = 2 * Math.PI * phase;
  const perfectPulse = clamp(1 - (now - perfectAt) / 230, 0, 1);
  drawPen(5 * Math.sin(radians), -4 * Math.sin(radians) ** 2, angle);
  thumb.setAttribute('transform', 'rotate(' + (reducedMotion.matches ? 0 : 8 * Math.sin(radians) ** 2) + ' 20 62)');
  trail.setAttribute('transform', 'rotate(' + (angle + 30) + ')');
  trail.setAttribute('opacity', .08 + perfectPulse * .68);

  const t = clamp(phase, 0, 1);
  beatDot.setAttribute('cx', 16 + 108 * t);
  beatDot.setAttribute('cy', 56 - 178 * t * (1 - t));
  trackFill.style.strokeDashoffset = String(1 - t);
  stage.dataset.window = String(Math.abs(now - nextBeat) <= hitWindow());
}

function render(now) {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  if (state === 'playing') {
    drawSpin(now);
    if (now - nextBeat > hitWindow()) {
      drop(now, 'Missed the beat');
      return;
    }
    if (now >= gradeUntil) grade.textContent = '';
  } else if (state === 'dropped') {
    const fall = clamp((now - dropAt) / 480, 0, 1);
    drawPen(dropPose.x - 104 * fall, dropPose.y + 280 * fall ** 2, dropPose.angle + 217 * fall);
    trail.setAttribute('opacity', '0');
    thumb.removeAttribute('transform');
    if (fall === 1) return;
  } else {
    return;
  }
  frame = requestAnimationFrame(render);
}

tapButton.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  tap(performance.now());
});
tapButton.addEventListener('click', (event) => {
  if (event.detail === 0) tap(performance.now());
});
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest('a, button:not(#tap)')) return;
  event.preventDefault();
  if (!event.repeat) tap(performance.now());
});
get('sound').addEventListener('click', () => {
  soundOn = !soundOn;
  showSound();
  saveSettings();
  unlockAudio();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || state !== 'playing') return;
  setState('paused', 'Resume spin', 'Resume spin');
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  grade.textContent = '';
  trail.setAttribute('opacity', '0');
  showResult('TAKE YOUR TIME', 'Run paused.', 'Tap to pick up the beat.');
});

drawPen(0, 0, penRestAngle);
showSound();
drawScore();
