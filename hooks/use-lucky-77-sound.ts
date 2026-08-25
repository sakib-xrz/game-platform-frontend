"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Lucky77SoundCue = "chip" | "lock" | "spin" | "win";
const SOUND_PREFERENCE_KEY = "lucky-77:sound-enabled";

function tone(
  context: AudioContext,
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
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function playCue(context: AudioContext, cue: Lucky77SoundCue) {
  const now = context.currentTime + 0.01;
  if (cue === "chip") {
    tone(context, 420, now, 0.08, 0.035, "triangle");
    tone(context, 720, now + 0.035, 0.09, 0.026);
  } else if (cue === "lock") {
    tone(context, 260, now, 0.12, 0.032, "square");
    tone(context, 190, now + 0.08, 0.16, 0.024, "triangle");
  } else if (cue === "spin") {
    [0, 0.08, 0.16, 0.24].forEach((offset, index) =>
      tone(context, 330 + index * 70, now + offset, 0.08, 0.018, "triangle"),
    );
  } else {
    tone(context, 523.25, now, 0.42, 0.035, "triangle");
    tone(context, 659.25, now + 0.09, 0.42, 0.032, "triangle");
    tone(context, 783.99, now + 0.18, 0.5, 0.03, "triangle");
  }
}

export function useLucky77Sound() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const enabledRef = useRef(true);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
    if (stored === "off") {
      enabledRef.current = false;
      const frame = window.requestAnimationFrame(() => setSoundEnabled(false));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => () => {
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const getContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    if (!window.AudioContext) return null;
    const context = new window.AudioContext();
    contextRef.current = context;
    return context;
  }, []);

  const playSound = useCallback((cue: Lucky77SoundCue) => {
    if (!enabledRef.current) return;
    const context = getContext();
    if (!context) return;
    const play = () => playCue(context, cue);
    if (context.state === "suspended") {
      void context.resume().then(play).catch(() => undefined);
    } else {
      play();
    }
  }, [getContext]);

  const toggleSound = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "on" : "off");
    if (next) playSound("chip");
  }, [playSound]);

  return { soundEnabled, toggleSound, playSound };
}
