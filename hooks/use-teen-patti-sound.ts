"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TeenPattiSoundCue =
  | "chip"
  | "bet"
  | "deal"
  | "flip"
  | "winner"
  | "payout";

const SOUND_PREFERENCE_KEY = "teen-patti:sound-enabled";

type BrowserAudioContext = AudioContext;

function tone(
  context: BrowserAudioContext,
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
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function playCue(context: BrowserAudioContext, cue: TeenPattiSoundCue) {
  const now = context.currentTime + 0.01;

  switch (cue) {
    case "chip":
      tone(context, 520, now, 0.08, 0.035, "triangle");
      tone(context, 760, now + 0.035, 0.07, 0.025, "sine");
      break;
    case "bet":
      tone(context, 310, now, 0.11, 0.045, "triangle");
      tone(context, 620, now + 0.055, 0.12, 0.035, "sine");
      break;
    case "deal":
      tone(context, 190, now, 0.09, 0.025, "sawtooth");
      tone(context, 240, now + 0.09, 0.09, 0.022, "sawtooth");
      tone(context, 300, now + 0.18, 0.1, 0.02, "sawtooth");
      break;
    case "flip":
      tone(context, 360, now, 0.06, 0.025, "square");
      tone(context, 540, now + 0.04, 0.08, 0.02, "triangle");
      break;
    case "winner":
      tone(context, 523.25, now, 0.42, 0.035, "triangle");
      tone(context, 659.25, now + 0.08, 0.42, 0.032, "triangle");
      tone(context, 783.99, now + 0.16, 0.5, 0.03, "triangle");
      break;
    case "payout":
      tone(context, 740, now, 0.1, 0.025, "sine");
      tone(context, 880, now + 0.08, 0.1, 0.025, "sine");
      tone(context, 1046.5, now + 0.16, 0.18, 0.024, "sine");
      break;
  }
}

export function useTeenPattiSound() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const contextRef = useRef<BrowserAudioContext | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
    let preferenceFrame = 0;
    if (stored === "off") {
      enabledRef.current = false;
      preferenceFrame = window.requestAnimationFrame(() => setEnabled(false));
    }
    return () => {
      if (preferenceFrame) window.cancelAnimationFrame(preferenceFrame);
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const getContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return null;
    const context = new AudioContextConstructor();
    contextRef.current = context;
    return context;
  }, []);

  const play = useCallback((cue: TeenPattiSoundCue) => {
    if (!enabledRef.current) return;
    const context = getContext();
    if (!context) return;
    const start = () => playCue(context, cue);
    if (context.state === "suspended") {
      void context.resume().then(start).catch(() => undefined);
    } else {
      start();
    }
  }, [getContext]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "on" : "off");
    if (next) {
      const context = getContext();
      if (!context) return;
      const start = () => playCue(context, "chip");
      if (context.state === "suspended") {
        void context.resume().then(start).catch(() => undefined);
      } else {
        start();
      }
    }
  }, [getContext]);

  return { soundEnabled: enabled, toggleSound: toggle, playSound: play };
}
