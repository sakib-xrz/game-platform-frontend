"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameSoundCue =
  | "chip"
  | "bet"
  | "lock"
  | "tick"
  | "deal"
  | "flip"
  | "win"
  | "lose"
  | "payout";

const SOUND_PREFERENCE_KEY = "game:sound-enabled";
const LEGACY_PREFERENCE_KEYS = [
  "teen-patti:sound-enabled",
  "lucky-77:sound-enabled",
] as const;

type BrowserAudioContext = AudioContext;

function tone(
  context: BrowserAudioContext,
  destination: AudioNode,
  frequency: number,
  startsAt: number,
  duration: number,
  volume: number,
  wave: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function playCue(
  context: BrowserAudioContext,
  destination: AudioNode,
  cue: GameSoundCue,
) {
  const now = context.currentTime + 0.01;

  switch (cue) {
    case "chip":
      tone(context, destination, 520, now, 0.08, 0.4, "triangle");
      tone(context, destination, 760, now + 0.035, 0.07, 0.32, "sine");
      break;
    case "bet":
      tone(context, destination, 310, now, 0.11, 0.48, "triangle");
      tone(context, destination, 620, now + 0.055, 0.12, 0.4, "sine");
      break;
    case "lock":
      tone(context, destination, 260, now, 0.12, 0.42, "square");
      tone(context, destination, 190, now + 0.08, 0.16, 0.35, "triangle");
      break;
    case "tick":
      tone(context, destination, 480, now, 0.045, 0.28, "square");
      tone(context, destination, 640, now + 0.02, 0.04, 0.2, "triangle");
      break;
    case "deal":
      tone(context, destination, 190, now, 0.09, 0.35, "sawtooth");
      tone(context, destination, 240, now + 0.09, 0.09, 0.32, "sawtooth");
      tone(context, destination, 300, now + 0.18, 0.1, 0.28, "sawtooth");
      break;
    case "flip":
      tone(context, destination, 360, now, 0.06, 0.35, "square");
      tone(context, destination, 540, now + 0.04, 0.08, 0.28, "triangle");
      break;
    case "win":
      tone(context, destination, 523.25, now, 0.42, 0.45, "triangle");
      tone(context, destination, 659.25, now + 0.08, 0.42, 0.42, "triangle");
      tone(context, destination, 783.99, now + 0.16, 0.5, 0.4, "triangle");
      break;
    case "lose":
      tone(context, destination, 280, now, 0.18, 0.38, "triangle");
      tone(context, destination, 220, now + 0.1, 0.22, 0.32, "sine");
      tone(context, destination, 160, now + 0.22, 0.28, 0.28, "sine");
      break;
    case "payout":
      tone(context, destination, 740, now, 0.1, 0.35, "sine");
      tone(context, destination, 880, now + 0.08, 0.1, 0.35, "sine");
      tone(context, destination, 1046.5, now + 0.16, 0.18, 0.32, "sine");
      break;
  }
}

function readStoredPreference(): boolean {
  const shared = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
  if (shared === "on") return true;
  if (shared === "off") return false;
  for (const key of LEGACY_PREFERENCE_KEYS) {
    const legacy = window.localStorage.getItem(key);
    if (legacy === "off") return false;
    if (legacy === "on") return true;
  }
  return true;
}

export function useGameSound() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const enabledRef = useRef(true);
  const contextRef = useRef<BrowserAudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const loopCueRef = useRef<GameSoundCue | null>(null);

  useEffect(() => {
    let preferenceFrame = 0;
    if (!readStoredPreference()) {
      enabledRef.current = false;
      preferenceFrame = window.requestAnimationFrame(() =>
        setSoundEnabled(false),
      );
    }
    return () => {
      if (preferenceFrame) window.cancelAnimationFrame(preferenceFrame);
      if (loopTimerRef.current) {
        window.clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      const context = contextRef.current;
      contextRef.current = null;
      masterGainRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const getDestination = useCallback(() => {
    if (contextRef.current && masterGainRef.current) {
      return {
        context: contextRef.current,
        destination: masterGainRef.current,
      };
    }
    if (!window.AudioContext) return null;
    const context = new window.AudioContext();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, context.currentTime);
    compressor.knee.setValueAtTime(18, context.currentTime);
    compressor.ratio.setValueAtTime(4, context.currentTime);
    compressor.attack.setValueAtTime(0.003, context.currentTime);
    compressor.release.setValueAtTime(0.12, context.currentTime);
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.85, context.currentTime);
    masterGain.connect(compressor);
    compressor.connect(context.destination);
    contextRef.current = context;
    masterGainRef.current = masterGain;
    return { context, destination: masterGain };
  }, []);

  const playCueNow = useCallback(
    (cue: GameSoundCue) => {
      const nodes = getDestination();
      if (!nodes) return;
      const { context, destination } = nodes;
      const start = () => playCue(context, destination, cue);
      if (context.state === "suspended") {
        void context.resume().then(start).catch(() => undefined);
      } else {
        start();
      }
    },
    [getDestination],
  );

  const playSound = useCallback(
    (cue: GameSoundCue) => {
      if (!enabledRef.current) return;
      playCueNow(cue);
    },
    [playCueNow],
  );

  const stopLoop = useCallback(() => {
    if (loopTimerRef.current) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    loopCueRef.current = null;
  }, []);

  const startLoop = useCallback(
    (cue: GameSoundCue, intervalMs: number) => {
      stopLoop();
      if (!enabledRef.current) return;
      loopCueRef.current = cue;
      playCueNow(cue);
      loopTimerRef.current = window.setInterval(() => {
        if (!enabledRef.current || loopCueRef.current !== cue) {
          stopLoop();
          return;
        }
        playCueNow(cue);
      }, Math.max(30, intervalMs));
    },
    [playCueNow, stopLoop],
  );

  const toggleSound = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "on" : "off");
    if (!next) {
      stopLoop();
      return;
    }
    playCueNow("chip");
  }, [playCueNow, stopLoop]);

  return {
    soundEnabled,
    toggleSound,
    playSound,
    startLoop,
    stopLoop,
  };
}
