/**
 * Plays an alarm sound using Web Audio API — no external file needed.
 * Works on all browsers. Stops automatically after durationMs.
 *
 * FIX: AudioContext must be created (or resumed) inside a user gesture.
 * We pre-unlock it on first tap so the arrived alarm always works.
 */

let alarmInterval = null;
let audioCtx = null;

// ─── Pre-unlock AudioContext on first user interaction ────────────────────────
// Browsers block audio until a user gesture happens. We create a silent
// AudioContext on the first tap/click so it's ready when the alarm fires.
let unlocked = false;
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Play a zero-length silent buffer to fully unlock the context
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.close();
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('click',      unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown',    unlockAudio, { once: true, passive: true });
}

// ─── Single beep helper ───────────────────────────────────────────────────────
function beep(ctx, frequency, startTime, duration, volume = 0.6) {
  const oscillator = ctx.createOscillator();
  const gainNode   = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.01);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// ─── Play arrival alarm ───────────────────────────────────────────────────────
export function playArrivalAlarm() {
  stopAlarm(); // stop any previous alarm first

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Resume context if it was suspended (required in some browsers)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    let count = 0;
    const maxRings = 10;

    const ring = () => {
      if (count >= maxRings || !audioCtx) return;
      const now = audioCtx.currentTime;
      // Doorbell pattern: ding-dong-ding
      beep(audioCtx, 880, now,        0.15); // ding
      beep(audioCtx, 660, now + 0.18, 0.15); // dong
      beep(audioCtx, 880, now + 0.36, 0.15); // ding
      count++;
    };

    ring(); // first ring immediately
    alarmInterval = setInterval(ring, 1200); // repeat every 1.2s

    // Auto-stop after 15 seconds
    setTimeout(stopAlarm, 15000);

    // Vibrate on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 200, 300, 200, 300, 200, 300]);
    }
  } catch (e) {
    console.warn('Audio alarm error — user may not have interacted yet:', e);
  }
}

// ─── Stop alarm ───────────────────────────────────────────────────────────────
export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch (e) {}
    audioCtx = null;
  }
  if ('vibrate' in navigator) {
    navigator.vibrate(0); // cancel vibration
  }
}
