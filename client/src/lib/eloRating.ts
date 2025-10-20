/**
 * Elo Rating System for Value Comparison
 * Efficiently ranks values with minimal comparisons
 */

export interface ValueItem {
  id: string;
  name: string;
  definition?: string | null;
  rating: number;
}

export interface Comparison {
  value1: ValueItem;
  value2: ValueItem;
  round: number;
}

export class EloRatingSystem {
  private values: ValueItem[];
  private comparisons: Array<{
    value1Id: string;
    value2Id: string;
    winnerId: string;
    round: number;
  }> = [];
  private currentRound: number = 0;
  private readonly K_FACTOR = 32; // Standard Elo K-factor
  private readonly INITIAL_RATING = 1000;
  private readonly TARGET_COMPARISONS: number;
  private comparedPairs: Set<string> = new Set();

  constructor(values: ValueItem[], targetComparisons?: number) {
    // Initialize all values with base rating
    this.values = values.map(v => ({
      ...v,
      rating: this.INITIAL_RATING,
    }));

    // Calculate target comparisons: 3-4 comparisons per value
    this.TARGET_COMPARISONS = targetComparisons || Math.min(
      values.length * 3,
      Math.floor((values.length * (values.length - 1)) / 4)
    );
  }

  /**
   * Get the next comparison pair
   */
  getNextComparison(): Comparison | null {
    if (this.currentRound >= this.TARGET_COMPARISONS) {
      return null;
    }

    let value1: ValueItem;
    let value2: ValueItem;

    // First half: Random comparisons to establish baseline
    if (this.currentRound < this.TARGET_COMPARISONS / 2) {
      [value1, value2] = this.getRandomPair();
    } else {
      // Second half: Focus on top values
      [value1, value2] = this.getTopValuesPair();
    }

    return {
      value1,
      value2,
      round: this.currentRound + 1,
    };
  }

  /**
   * Get a random pair that hasn't been compared yet
   */
  private getRandomPair(): [ValueItem, ValueItem] {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const idx1 = Math.floor(Math.random() * this.values.length);
      let idx2 = Math.floor(Math.random() * this.values.length);

      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * this.values.length);
      }

      const value1 = this.values[idx1];
      const value2 = this.values[idx2];
      const pairKey = this.getPairKey(value1.id, value2.id);

      if (!this.comparedPairs.has(pairKey)) {
        this.comparedPairs.add(pairKey);
        return [value1, value2];
      }

      attempts++;
    }

    // If we can't find a new pair, just return any pair
    return [this.values[0], this.values[1]];
  }

  /**
   * Get a pair from top-rated values
   */
  private getTopValuesPair(): [ValueItem, ValueItem] {
    // Sort by rating
    const sorted = [...this.values].sort((a, b) => b.rating - a.rating);

    // Focus on top 15 values
    const topValues = sorted.slice(0, Math.min(15, sorted.length));

    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const idx1 = Math.floor(Math.random() * topValues.length);
      let idx2 = Math.floor(Math.random() * topValues.length);

      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * topValues.length);
      }

      const value1 = topValues[idx1];
      const value2 = topValues[idx2];
      const pairKey = this.getPairKey(value1.id, value2.id);

      if (!this.comparedPairs.has(pairKey)) {
        this.comparedPairs.add(pairKey);
        return [value1, value2];
      }

      attempts++;
    }

    // Fallback: compare any two top values
    return [topValues[0], topValues[1]];
  }

  /**
   * Record a comparison result and update Elo ratings
   */
  recordComparison(value1Id: string, value2Id: string, winnerId: string): void {
    const value1 = this.values.find(v => v.id === value1Id);
    const value2 = this.values.find(v => v.id === value2Id);

    if (!value1 || !value2) {
      throw new Error("Invalid value IDs");
    }

    // Calculate expected scores
    const expectedScore1 = this.getExpectedScore(value1.rating, value2.rating);
    const expectedScore2 = 1 - expectedScore1;

    // Actual scores (1 for winner, 0 for loser)
    const actualScore1 = winnerId === value1Id ? 1 : 0;
    const actualScore2 = winnerId === value2Id ? 1 : 0;

    // Update ratings
    value1.rating = Math.round(value1.rating + this.K_FACTOR * (actualScore1 - expectedScore1));
    value2.rating = Math.round(value2.rating + this.K_FACTOR * (actualScore2 - expectedScore2));

    // Record comparison
    this.comparisons.push({
      value1Id,
      value2Id,
      winnerId,
      round: this.currentRound + 1,
    });

    this.currentRound++;
  }

  /**
   * Calculate expected score using Elo formula
   */
  private getExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Generate a unique key for a pair
   */
  private getPairKey(id1: string, id2: string): string {
    return [id1, id2].sort().join('-');
  }

  /**
   * Get top N values by rating
   */
  getTopValues(n: number = 10): Array<{ value: ValueItem; rating: number; rank: number }> {
    const sorted = [...this.values].sort((a, b) => b.rating - a.rating);

    return sorted.slice(0, n).map((value, index) => ({
      value,
      rating: value.rating,
      rank: index + 1,
    }));
  }

  /**
   * Get current progress
   */
  getProgress(): { current: number; total: number; percentage: number } {
    const percentage = (this.currentRound / this.TARGET_COMPARISONS) * 100;
    return {
      current: this.currentRound,
      total: this.TARGET_COMPARISONS,
      percentage: Math.min(100, percentage),
    };
  }

  /**
   * Check if comparison is complete
   */
  isComplete(): boolean {
    return this.currentRound >= this.TARGET_COMPARISONS;
  }

  /**
   * Get all ratings
   */
  getAllRatings(): Map<string, number> {
    const ratings = new Map<string, number>();
    this.values.forEach(v => ratings.set(v.id, v.rating));
    return ratings;
  }

  /**
   * Get all comparisons
   */
  getComparisons() {
    return [...this.comparisons];
  }

  /**
   * Get current round number
   */
  getCurrentRound(): number {
    return this.currentRound;
  }
}

/**
 * Calculate recommended number of comparisons
 */
export function calculateRecommendedComparisons(valueCount: number): number {
  // 3-4 comparisons per value, but cap at reasonable maximum
  return Math.min(
    valueCount * 3,
    Math.floor((valueCount * (valueCount - 1)) / 4),
    150 // Maximum 150 comparisons
  );
}

