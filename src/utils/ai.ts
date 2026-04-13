/**
 * Mock AI heuristics to determine predicted final bids and detect potentially fraudulent bidding behavior.
 * In a real production scalable application, this logic should be offloaded to a Supabase Edge Function or external ML Service.
 */

export function predictFinalBid(currentPrice: number, startPrice: number, timeRemainingMs: number, bidCount: number): number {
  if (bidCount === 0) return startPrice * 1.5;

  // Assume exponential heat as time runs out
  const hoursLeft = Math.max(timeRemainingMs / (1000 * 60 * 60), 0.1);
  const bidVelocity = bidCount / Math.max((24 * 7) - hoursLeft, 1); // rough bids per hour

  // The smaller the time, the more "bidding wars" multiply the final value.
  const scarcityMultiplier = hoursLeft < 1 ? 1.4 : hoursLeft < 24 ? 1.1 : 1.0;

  // Add some perceived value cap based on how fast it's growing
  const predictedValue = currentPrice * (1 + (bidVelocity * 0.1)) * scarcityMultiplier;

  // Ensure prediction is always sensibly higher than current price
  return Math.max(Math.round(predictedValue), currentPrice * 1.1);
}

export function detectFraud(
  newBidAmount: number,
  currentPrice: number,
  isSameUser: boolean
): { isFraud: boolean; reason?: string } {
  // 1. Shilling or Self-bidding
  if (isSameUser) {
    return {
      isFraud: true,
      reason: "Self-bidding detected. You cannot artificially inflate your top bid.",
    };
  }

  // 2. Unusually massive leap without reason
  // E.g., someone bids 100x the current price maliciously to lock it
  if (currentPrice > 0 && newBidAmount > currentPrice * 10) {
    return {
      isFraud: true,
      reason: "Anomalous bid amount detected. Bid exceeds 1000% of current price.",
    };
  }

  return { isFraud: false };
}
