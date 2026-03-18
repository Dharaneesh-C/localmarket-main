/**
 * Plays an alarm sound using Web Audio API — no external file needed.
 * Works on all browsers. Stops automatically after `durationMs`.
 */

let alarmInterval = null;
let audioCtx = null;

function beep(ctx, frequency, startTime, duration, volume = 0.6) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

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

export function playArrivalAlarm() {
  stopAlarm();

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let count = 0;
    const maxRings = 10; // Ring 10 times then stop

    const ring = () => {
      if (count >= maxRings || !audioCtx) return;
      const now = audioCtx.currentTime;
      // Pattern: high-low-high like a doorbell
      beep(audioCtx, 880, now, 0.15);        // ding
      beep(audioCtx, 660, now + 0.18, 0.15); // dong
      beep(audioCtx, 880, now + 0.36, 0.15); // ding
      count++;
    };

    ring(); // first ring immediately
    alarmInterval = setInterval(ring, 1200); // repeat every 1.2s

    // Auto stop after 15 seconds
    setTimeout(stopAlarm, 15000);

    // Vibrate if supported (mobile)
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 200, 300, 200, 300, 200, 300]);
    }
  } catch (e) {
    console.error('Audio alarm error:', e);
  }
}

export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch (e) {}
    audioCtx = null;
  }
}
