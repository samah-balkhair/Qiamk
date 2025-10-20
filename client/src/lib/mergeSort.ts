/**
 * Interactive Merge Sort implementation for value comparison
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
  leftIndex: number;
  rightIndex: number;
  mergeLevel: number;
}

interface MergeState {
  left: ValueItem[];
  right: ValueItem[];
  leftIndex: number;
  rightIndex: number;
  result: ValueItem[];
  level: number;
}

export class InteractiveMergeSort {
  private values: ValueItem[];
  private comparisons: Comparison[] = [];
  private currentComparisonIndex: number = 0;
  private mergeStack: MergeState[] = [];
  private finalResult: ValueItem[] = [];
  private comparisonResults: Map<string, string> = new Map(); // key: "id1-id2", value: winnerId

  constructor(values: ValueItem[]) {
    this.values = [...values];
    this.initializeMergeSort();
  }

  private initializeMergeSort() {
    // Start the merge sort process
    this.generateComparisons(this.values, 0);
  }

  private generateComparisons(arr: ValueItem[], level: number): void {
    if (arr.length <= 1) return;

    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);

    // Recursively generate comparisons for left and right
    this.generateComparisons(left, level + 1);
    this.generateComparisons(right, level + 1);

    // Generate merge comparisons
    this.generateMergeComparisons(left, right, level);
  }

  private generateMergeComparisons(left: ValueItem[], right: ValueItem[], level: number): void {
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const value1 = left[leftIndex];
      const value2 = right[rightIndex];

      // Add comparison
      this.comparisons.push({
        value1,
        value2,
        leftIndex,
        rightIndex,
        mergeLevel: level,
      });

      // For initialization, we don't know the result yet
      // We'll simulate that left wins (this will be overridden by actual user choices)
      leftIndex++;
    }
  }

  getCurrentComparison(): Comparison | null {
    if (this.currentComparisonIndex >= this.comparisons.length) {
      return null;
    }
    return this.comparisons[this.currentComparisonIndex];
  }

  recordChoice(value1Id: string, value2Id: string, selectedValueId: string): void {
    const key = `${value1Id}-${value2Id}`;
    const reverseKey = `${value2Id}-${value1Id}`;
    
    this.comparisonResults.set(key, selectedValueId);
    this.comparisonResults.set(reverseKey, selectedValueId);
    
    this.currentComparisonIndex++;
  }

  getTotalComparisons(): number {
    return this.comparisons.length;
  }

  getCurrentIndex(): number {
    return this.currentComparisonIndex;
  }

  isComplete(): boolean {
    return this.currentComparisonIndex >= this.comparisons.length;
  }

  getComparisonResults(): Map<string, string> {
    return new Map(this.comparisonResults);
  }

  // Calculate scores based on comparison results
  getScores(): Map<string, number> {
    const scores = new Map<string, number>();
    
    // Initialize scores
    this.values.forEach(v => scores.set(v.id, 0));
    
    // Count wins
    this.comparisonResults.forEach((winnerId) => {
      const currentScore = scores.get(winnerId) || 0;
      scores.set(winnerId, currentScore + 1);
    });
    
    return scores;
  }

  getTopValues(n: number = 10): Array<{ value: ValueItem; score: number }> {
    const scores = this.getScores();
    
    const sorted = Array.from(scores.entries())
      .map(([id, score]) => {
        const value = this.values.find(v => v.id === id);
        return { value: value!, score };
      })
      .filter(item => item.value)
      .sort((a, b) => b.score - a.score);

    return sorted.slice(0, n);
  }
}

/**
 * Calculate expected number of comparisons for merge sort
 */
export function calculateExpectedComparisons(n: number): number {
  if (n <= 1) return 0;
  return Math.ceil(n * Math.log2(n));
}

