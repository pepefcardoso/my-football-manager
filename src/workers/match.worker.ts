let timer: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case "START": {
      if (timer) clearInterval(timer);
      const delay = calculateDelay(payload.speed);
      timer = setInterval(() => {
        self.postMessage({ type: "TICK" });
      }, delay);
      break;
    }

    case "STOP":
    case "PAUSE":
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      break;

    case "SET_SPEED":
      if (timer) {
        clearInterval(timer);
        const newDelay = calculateDelay(payload.speed);
        timer = setInterval(() => {
          self.postMessage({ type: "TICK" });
        }, newDelay);
      }
      break;
  }
};

function calculateDelay(speed: number): number {
  if (speed >= 4) return 50;
  if (speed >= 2) return 200;
  return 800;
}

export {};
