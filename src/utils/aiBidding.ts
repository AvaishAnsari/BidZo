/**
 * aiBidding.ts
 * 
 * Provides an algorithmic pseudo-AI model to calculate "Smart Bids".
 * Simulates intelligent bid generation based on current price, time remaining,
 * and minimum increments to maximize win probability and psychological intimidation.
 */

export interface AISuggestion {
  type: 'Conservative' | 'Optimal' | 'Knockout';
  amount: number;
  probability: number;
  rationale: string;
}

/**
 * Rounds a number cleanly up to the nearest 'pretty' interval (e.g. 50, 100, 500)
 * depending on the magnitude of the number.
 */
function roundToPrettyNumber(num: number): number {
  if (num < 100) return Math.ceil(num / 5) * 5;
  if (num < 1000) return Math.ceil(num / 10) * 10;
  if (num < 10000) return Math.ceil(num / 50) * 50;
  return Math.ceil(num / 100) * 100;
}

/**
 * Calculates three strategic bid recommendations.
 * 
 * @param currentPrice The current highest bid
 * @param minIncrement The minimum jump required
 * @param timeRemainingMs The milliseconds left in the auction
 * @param bidCount Total number of bids placed so far (simulates competition heat)
 * @returns Array of 3 strategic suggestions
 */
export function calculateSmartBids(
  currentPrice: number,
  minIncrement: number,
  timeRemainingMs: number,
  bidCount: number = 0
): AISuggestion[] {
  
  // Base required bid
  const minRequired = currentPrice + minIncrement;
  
  // 1. Conservative (Base minimal jump)
  // Win Prob: Low. Just gets you in the door.
  const conservativeProb = timeRemainingMs < 60000 ? 30 : 50;
  const conservativeAmt = Math.max(minRequired, roundToPrettyNumber(minRequired));
  
  // 2. Optimal (Competitive jump)
  // Win Prob: Good. Calculates a jump based on the heat of the auction.
  const heatMultiplier = Math.min(2.5, 1 + (bidCount * 0.1));
  const optimalRaw = currentPrice + (minIncrement * heatMultiplier * 1.5);
  let optimalAmt = roundToPrettyNumber(optimalRaw);
  if (optimalAmt <= conservativeAmt) optimalAmt = conservativeAmt + minIncrement;
  const optimalProb = timeRemainingMs < 60000 ? 75 : 85;

  // 3. Knockout (Intimidation jump)
  // Win Prob: Very High. Tries to jump to the next major psychological threshold.
  const magnitude = Math.pow(10, Math.floor(Math.log10(currentPrice || 100)));
  const knockoutRaw = currentPrice + Math.max(minIncrement * 4, magnitude * 0.5);
  
  // Push it slightly over the exact round number to break ties psychologically (e.g. 1010 instead of 1000)
  let knockoutAmt = roundToPrettyNumber(knockoutRaw);
  // Give it that "Walmart" psychological twist depending on size
  if (knockoutAmt > optimalAmt + minIncrement) {
      // Just a clean aggressive number
  } else {
      knockoutAmt = roundToPrettyNumber(optimalAmt + (minIncrement * 3));
  }
  
  const knockoutProb = 98;

  return [
    {
      type: 'Conservative',
      amount: conservativeAmt,
      probability: conservativeProb,
      rationale: 'Meets minimum requirement. High risk of being immediately outbid.'
    },
    {
      type: 'Optimal',
      amount: optimalAmt,
      probability: optimalProb,
      rationale: 'Algorithmically balanced for price-efficiency vs win probability.'
    },
    {
      type: 'Knockout',
      amount: knockoutAmt,
      probability: knockoutProb,
      rationale: 'Aggressive jump designed to intimidate competitors and secure the item.'
    }
  ];
}
