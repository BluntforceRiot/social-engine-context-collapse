type Cue =
  | "click"
  | "notification"
  | "viral"
  | "collapse"
  | "repair"
  | "damage"
  | "victory"
  | "failure";

const MUTE_KEY = "social-engine.contextCollapse.muted.v1";

let context: AudioContext | undefined;
let muted = localStorage.getItem(MUTE_KEY) === "true";

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, String(muted));
  if (!muted) {
    void ensureContext();
    playCue("click");
  }
  return muted;
}

export function playCue(cue: Cue): void {
  if (muted) return;
  void ensureContext().then((audio) => {
    if (!audio) return;
    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + durationFor(cue));
    master.connect(audio.destination);

    for (const [offset, frequency] of frequenciesFor(cue).entries()) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = cue === "collapse" || cue === "damage" ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(frequency, now + offset * 0.055);
      gain.gain.setValueAtTime(0.0001, now + offset * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.32, now + offset * 0.055 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset * 0.055 + 0.13);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset * 0.055);
      osc.stop(now + offset * 0.055 + 0.16);
    }
  });
}

async function ensureContext(): Promise<AudioContext | undefined> {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") {
      await context.resume();
    }
    return context;
  } catch {
    return undefined;
  }
}

function frequenciesFor(cue: Cue): number[] {
  const map: Record<Cue, number[]> = {
    click: [420],
    notification: [620, 840],
    viral: [440, 660, 990, 1320],
    collapse: [280, 210, 160],
    repair: [360, 540, 720],
    damage: [180, 150],
    victory: [392, 523, 659, 784],
    failure: [330, 247, 196],
  };
  return map[cue];
}

function durationFor(cue: Cue): number {
  return cue === "victory" || cue === "viral" ? 0.48 : 0.34;
}
