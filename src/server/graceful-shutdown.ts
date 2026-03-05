let initialized = false;
let shuttingDown = false;
let shutdownReason = "";
let shutdownAt = 0;

function onSignal(signal: NodeJS.Signals): void {
  shuttingDown = true;
  shutdownReason = signal;
  shutdownAt = Date.now();
}

export function initGracefulShutdownHooks(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function getShutdownState(): {
  shuttingDown: boolean;
  reason: string;
  at: number;
} {
  return {
    shuttingDown,
    reason: shutdownReason,
    at: shutdownAt
  };
}

export function resetShutdownStateForTests(): void {
  shuttingDown = false;
  shutdownReason = "";
  shutdownAt = 0;
}
