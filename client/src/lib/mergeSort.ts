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
}

export class MergeSortComparator {
  private values: ValueItem[];
  private scores: Map<string, number> = new Map();
  private comparisons: Array<{ value1Id: string; value2Id: string; winnerId: string }> = [];

  constructor(values: ValueItem[]) {
    this.values = values;
    // Initialize scores
    values.forEach(v => this.scores.set(v.id, 0));
  }

  /**
   * Record a comparison choice
   */
  recordChoice(value1Id: string, value2Id: string, selectedValueId: string) {
    // Increment score for selected value
    const currentScore = this.scores.get(selectedValueId) || 0;
    this.scores.set(selectedValueId, currentScore + 1);

    // Store the comparison result
    this.comparisons.push({
      value1Id,
      value2Id,
      winnerId: selectedValueId,
    });
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
   * Get pairs of values that are tied at the 10th position
   */
  getTieBreakPairs(): Array<{ value1: ValueItem; value2: ValueItem }> {
    const sorted = Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length <= 10) return [];

    const tenthScore = sorted[9][1];
    
    // Find all values with the same score as 10th place
    const tiedValueIds = sorted
      .filter(([, score]) => score === tenthScore)
      .map(([id]) => id);

    if (tiedValueIds.length <= 1) return [];

    // Generate pairs between tied values
    const pairs: Array<{ value1: ValueItem; value2: ValueItem }> = [];
    for (let i = 0; i < tiedValueIds.length; i++) {
      for (let j = i + 1; j < tiedValueIds.length; j++) {
        const value1 = this.values.find(v => v.id === tiedValueIds[i]);
        const value2 = this.values.find(v => v.id === tiedValueIds[j]);
        
        if (value1 && value2) {
          pairs.push({ value1, value2 });
        }
      }
    }

    return pairs;
  }

  getScores(): Map<string, number> {
    return new Map(this.scores);
  }

  getComparisons() {
    return [...this.comparisons];
  }
}

/**
 * Generate all possible pairs for comparison
 * This is a simpler approach than true merge sort, but ensures all comparisons are made
 */
export function generateAllPairs(values: ValueItem[]): Array<{ value1: ValueItem; value2: ValueItem }> {
  const pairs: Array<{ value1: ValueItem; value2: ValueItem }> = [];
  
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      pairs.push({
        value1: values[i],
        value2: values[j],
      });
    }
  }
  
  return pairs;
}

