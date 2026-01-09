import { useState, useEffect, useCallback, useRef } from "react";

const TIMER_DEFAULTS = {
  INITIAL_MINUTE: 0,
  MAX_DURATION: 94,
  BASE_TICK_MS: 1000,
  INITIAL_SPEED: 1,
};

export interface MatchTimerOptions {
  initialMinute?: number;
  maxDuration?: number;
  initialSpeed?: number;
  autoStart?: boolean;
  onFinish?: () => void;
}

export interface MatchTimerControl {
  currentMinute: number;
  isPlaying: boolean;
  speed: number;
  isFinished: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  skipToFinish: () => void;
  reset: () => void;
}

export const useMatchTimer = (
  options: MatchTimerOptions = {}
): MatchTimerControl => {
  const {
    initialMinute = TIMER_DEFAULTS.INITIAL_MINUTE,
    maxDuration = TIMER_DEFAULTS.MAX_DURATION,
    initialSpeed = TIMER_DEFAULTS.INITIAL_SPEED,
    autoStart = true,
    onFinish,
  } = options;

  const [currentMinute, setCurrentMinute] = useState(initialMinute);
  const [isPlaying, setIsPlaying] = useState(() => autoStart && initialMinute < maxDuration);
  const [speed, setSpeed] = useState(initialSpeed);

  const currentMinuteRef = useRef(currentMinute);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    currentMinuteRef.current = currentMinute;
  }, [currentMinute]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!isPlaying) return;

    if (currentMinuteRef.current >= maxDuration) {
      return;
    }

    const tickRate = TIMER_DEFAULTS.BASE_TICK_MS / Math.max(speed, 0.000001);

    const intervalId = setInterval(() => {
      if (currentMinuteRef.current >= maxDuration) {
        setIsPlaying(false);
        if (onFinishRef.current) onFinishRef.current();
        return;
      }

      setCurrentMinute((prev) => {
        const next = prev + 1;
        if (next > maxDuration) return maxDuration;
        return next;
      });
    }, tickRate);

    return () => clearInterval(intervalId);
  }, [isPlaying, speed, maxDuration]);

  const play = useCallback(() => {
    if (currentMinuteRef.current < maxDuration) {
      setIsPlaying(true);
    }
  }, [maxDuration]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prevIsPlaying) => {
      if (!prevIsPlaying && currentMinuteRef.current >= maxDuration) return false;
      return !prevIsPlaying;
    });
  }, [maxDuration]);

  const handleSetSpeed = useCallback((newSpeed: number) => {
    setSpeed(Math.max(0.5, newSpeed));
  }, []);

  const skipToFinish = useCallback(() => {
    setIsPlaying(false);
    setCurrentMinute(maxDuration);
    if (onFinishRef.current) onFinishRef.current();
  }, [maxDuration]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentMinute(initialMinute);
    setSpeed(initialSpeed);
  }, [initialMinute, initialSpeed]);

  return {
    currentMinute,
    isPlaying,
    speed,
    isFinished: currentMinute >= maxDuration,
    play,
    pause,
    togglePlay,
    setSpeed: handleSetSpeed,
    skipToFinish,
    reset,
  };
};
