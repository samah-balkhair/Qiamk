/**
 * Merge Sort implementation for value comparison
 * This algorithm reduces comparisons from n*(n-1)/2 to approximately n*log2(n)
 */

export interface ValueItem {
  id: string;
  name: string;
  definition?: string | null;
}

export interface Comparison {
  value1: ValueItem;
  value2: ValueItem;
  round: number;
}

export class MergeSortComparator {
  private comparisons: Comparison[] = [];
  private currentRound = 0;
  private pendingComparisons: Comparison[] = [];
  private scores: Map<string, number> = new Map();

  constructor(private values: ValueItem[]) {
    // Initialize scores
    values.forEach(v => this.scores.set(v.id, 0));
  }

  /**
   * Start the merge sort process and generate all comparisons
   */
  generateComparisons(): Comparison[] {
    this.comparisons = [];
    this.currentRound = 0;
    this.mergeSortWithComparisons(this.values);
    return this.comparisons;
  }

  /**
   * Merge sort that tracks comparisons
   */
  private mergeSortWithComparisons(arr: ValueItem[]): ValueItem[] {
    if (arr.length <= 1) return arr;

    const mid = Math.floor(arr.length / 2);
    const left = this.mergeSortWithComparisons(arr.slice(0, mid));
    const right = this.mergeSortWithComparisons(arr.slice(mid));

    return this.mergeWithComparisons(left, right);
  }

  /**
   * Merge two sorted arrays and generate comparisons
   */
  private mergeWithComparisons(left: ValueItem[], right: ValueItem[]): ValueItem[] {
    const result: ValueItem[] = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
      // Generate comparison between heads of the two lists
      this.currentRound++;
      this.comparisons.push({
        value1: left[i],
        value2: right[j],
        round: this.currentRound,
      });

      // For now, we'll assume left[i] is chosen (this will be replaced by user choice)
      // This is just to complete the algorithm structure
      result.push(left[i]);
      i++;
    }

    // Add remaining elements
    while (i < left.length) {
      result.push(left[i]);
      i++;
    }

    while (j < right.length) {
      result.push(right[j]);
      j++;
    }

    return result;
  }

  /**
   * Process user's choice for a comparison
   */
  recordChoice(comparisonIndex: number, selectedValueId: string) {
    if (comparisonIndex >= this.comparisons.length) {
      throw new Error("Invalid comparison index");
    }

    const comparison = this.comparisons[comparisonIndex];
    
    // Increment score for selected value
    const currentScore = this.scores.get(selectedValueId) || 0;
    this.scores.set(selectedValueId, currentScore + 1);
  }

  /**
   * Get top N values based on scores
   */
  getTopValues(n: number = 10): Array<{ value: ValueItem; score: number }> {
    const sorted = Array.from(this.scores.entries())
      .map(([id, score]) => {
        const value = this.values.find(v => v.id === id);
        return { value: value!, score };
      })
      .filter(item => item.value)
      .sort((a, b) => b.score - a.score);

    return sorted.slice(0, n);
  }

  /**
   * Check if we need to continue comparisons
   * Continue if the 10th and 11th values have the same score
   */
  shouldContinue(): boolean {
    const sorted = Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length <= 10) return false;

    const tenthScore = sorted[9][1];
    const eleventhScore = sorted[10][1];

    return tenthScore === eleventhScore;
  }

  /**
   * Generate additional comparisons for tied values
   */
  generateTieBreakComparisons(): Comparison[] {
    const sorted = Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length <= 10) return [];

    const tenthScore = sorted[9][1];
    
    // Find all values with the same score as 10th place
    const tiedValueIds = sorted
      .filter(([, score]) => score === tenthScore)
      .map(([id]) => id);

    if (tiedValueIds.length <= 1) return [];

    // Generate comparisons between tied values
    const tieBreakComparisons: Comparison[] = [];
    for (let i = 0; i < tiedValueIds.length; i++) {
      for (let j = i + 1; j < tiedValueIds.length; j++) {
        const value1 = this.values.find(v => v.id === tiedValueIds[i]);
        const value2 = this.values.find(v => v.id === tiedValueIds[j]);
        
        if (value1 && value2) {
          this.currentRound++;
          tieBreakComparisons.push({
            value1,
            value2,
            round: this.currentRound,
          });
        }
      }
    }

    this.comparisons.push(...tieBreakComparisons);
    return tieBreakComparisons;
  }

  getScores(): Map<string, number> {
    return new Map(this.scores);
  }
}

