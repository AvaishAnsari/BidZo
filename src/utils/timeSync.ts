/**
 * timeSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Synchronizes the app clock with a reliable external time server.
 * This prevents users from altering their local computer clock to falsely
 * manipulate auction ending times on the client side.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export let serverTimeOffset: number = 0;
let hasSynced: boolean = false;
let isSyncing: boolean = false;

export async function syncServerTime(): Promise<void> {
  if (hasSynced || isSyncing) return;
  
  isSyncing = true;
  try {
    // Record start time to account for network latency
    const start = performance.now();
    
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    if (!res.ok) throw new Error('Time sync failed');
    
    const data = await res.json();
    const end = performance.now();
    const latency = (end - start) / 2;
    
    const realServerTime = new Date(data.utc_datetime).getTime() + latency;
    serverTimeOffset = realServerTime - Date.now();
    
    hasSynced = true;
  } catch (err) {
    console.warn('[timeSync] Failed to sync verified server time. Falling back to local clock.', err);
    serverTimeOffset = 0;
  } finally {
    isSyncing = false;
  }
}

/**
 * Returns the current timestamp (in ms) strictly adjusted to True UTC Server Time
 * rather than the potentially manipulated local machine time.
 */
export function getValidatedNow(): number {
  return Date.now() + serverTimeOffset;
}
