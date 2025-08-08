/**
 * Sparse Matrix implementation for efficient similarity storage
 * Only stores significant similarities (above threshold)
 */

export interface SparseEntry {
  row: number;
  col: number;
  value: number;
}

export class SparseMatrix {
  private data: Map<string, number>;
  private rows: number;
  private cols: number;
  private threshold: number;

  constructor(rows: number, cols: number, threshold = 0.1) {
    this.data = new Map();
    this.rows = rows;
    this.cols = cols;
    this.threshold = threshold;
  }

  /**
   * Generate key for row,col pair
   */
  private key(row: number, col: number): string {
    return `${row},${col}`;
  }

  /**
   * Set a value (only if above threshold)
   */
  set(row: number, col: number, value: number): void {
    if (row >= this.rows || col >= this.cols || row < 0 || col < 0) {
      throw new Error(`Index out of bounds: (${row}, ${col})`);
    }

    if (Math.abs(value) >= this.threshold) {
      this.data.set(this.key(row, col), value);
    } else {
      // Remove if below threshold
      this.data.delete(this.key(row, col));
    }
  }

  /**
   * Get a value
   */
  get(row: number, col: number): number {
    return this.data.get(this.key(row, col)) || 0;
  }

  /**
   * Get all non-zero entries
   */
  getNonZeroEntries(): SparseEntry[] {
    const entries: SparseEntry[] = [];
    this.data.forEach((value, key) => {
      const parts = key.split(',').map(Number);
      const row = parts[0];
      const col = parts[1];
      if (row !== undefined && col !== undefined) {
        entries.push({ row, col, value });
      }
    });
    return entries;
  }

  /**
   * Get row as array
   */
  getRow(row: number): number[] {
    const result = new Array(this.cols).fill(0);
    for (let col = 0; col < this.cols; col++) {
      result[col] = this.get(row, col);
    }
    return result;
  }

  /**
   * Get column as array
   */
  getCol(col: number): number[] {
    const result = new Array(this.rows).fill(0);
    for (let row = 0; row < this.rows; row++) {
      result[row] = this.get(row, col);
    }
    return result;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      rows: this.rows,
      cols: this.cols,
      nonZeroElements: this.data.size,
      sparsity: 1 - (this.data.size / (this.rows * this.cols)),
      threshold: this.threshold,
      memoryUsage: this.data.size * 16 // Approximate bytes
    };
  }
}

/**
 * Similarity Matrix specialized for thought comparisons
 */
export class SimilarityMatrix {
  private matrix: SparseMatrix;
  private thoughtIds: Map<string, number>; // thoughtId -> index
  private indexToId: Map<number, string>; // index -> thoughtId
  private nextIndex = 0;

  constructor(threshold = 0.3) {
    // Start with reasonable size, will grow as needed
    this.matrix = new SparseMatrix(1000, 1000, threshold);
    this.thoughtIds = new Map();
    this.indexToId = new Map();
  }

  /**
   * Register a new thought
   */
  registerThought(thoughtId: string): number {
    const existingIndex = this.thoughtIds.get(thoughtId);
    if (existingIndex !== undefined) {
      return existingIndex;
    }

    const index = this.nextIndex++;
    this.thoughtIds.set(thoughtId, index);
    this.indexToId.set(index, thoughtId);

    // Grow matrix if needed
    if (index >= this.matrix['rows']) {
      const newSize = Math.max(this.matrix['rows'] * 2, index + 1);
      this.growMatrix(newSize);
    }

    return index;
  }

  /**
   * Grow the matrix size
   */
  private growMatrix(newSize: number): void {
    const oldMatrix = this.matrix;
    const entries = oldMatrix.getNonZeroEntries();
    
    this.matrix = new SparseMatrix(newSize, newSize, oldMatrix['threshold']);
    
    // Copy old data
    for (const entry of entries) {
      this.matrix.set(entry.row, entry.col, entry.value);
    }
  }

  /**
   * Set similarity between two thoughts
   */
  setSimilarity(thoughtId1: string, thoughtId2: string, similarity: number): void {
    const idx1 = this.registerThought(thoughtId1);
    const idx2 = this.registerThought(thoughtId2);

    // Store symmetrically
    this.matrix.set(idx1, idx2, similarity);
    this.matrix.set(idx2, idx1, similarity);
  }

  /**
   * Get similarity between two thoughts
   */
  getSimilarity(thoughtId1: string, thoughtId2: string): number {
    const idx1 = this.thoughtIds.get(thoughtId1);
    const idx2 = this.thoughtIds.get(thoughtId2);

    if (idx1 === undefined || idx2 === undefined) {
      return 0;
    }

    return this.matrix.get(idx1, idx2);
  }

  /**
   * Get most similar thoughts to a given thought
   */
  getMostSimilar(thoughtId: string, topK = 5): Array<{thoughtId: string, similarity: number}> {
    const idx = this.thoughtIds.get(thoughtId);
    if (idx === undefined) {
      return [];
    }

    const similarities: Array<{thoughtId: string, similarity: number}> = [];
    const row = this.matrix.getRow(idx);

    for (let i = 0; i < row.length; i++) {
      const similarity = row[i];
      if (similarity !== undefined && i !== idx && similarity > 0) {
        const otherId = this.indexToId.get(i);
        if (otherId) {
          similarities.push({ thoughtId: otherId, similarity });
        }
      }
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }

  /**
   * Get clusters of similar thoughts
   */
  getClusters(minSimilarity = 0.5): string[][] {
    const visited = new Set<number>();
    const clusters: string[][] = [];

    const dfs = (index: number, cluster: number[]): void => {
      if (visited.has(index)) {
        return;
      }
      visited.add(index);
      cluster.push(index);

      const row = this.matrix.getRow(index);
      for (let i = 0; i < row.length; i++) {
        const similarity = row[i];
        if (similarity !== undefined && i !== index && similarity >= minSimilarity && !visited.has(i)) {
          dfs(i, cluster);
        }
      }
    };

    // Find clusters
    for (let i = 0; i < this.nextIndex; i++) {
      if (!visited.has(i)) {
        const cluster: number[] = [];
        dfs(i, cluster);
        
        if (cluster.length > 1) {
          const thoughtCluster = cluster
            .map(idx => this.indexToId.get(idx))
            .filter(id => id !== undefined);
          
          if (thoughtCluster.length > 1) {
            clusters.push(thoughtCluster);
          }
        }
      }
    }

    return clusters;
  }

  /**
   * Get matrix statistics
   */
  getStats() {
    const matrixStats = this.matrix.getStats();
    return {
      ...matrixStats,
      numThoughts: this.thoughtIds.size,
      averageConnectionsPerThought: (matrixStats.nonZeroElements * 2) / this.thoughtIds.size
    };
  }
}
