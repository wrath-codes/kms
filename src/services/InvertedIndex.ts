// ---------------------------------------------------------------------------
// Inverted Index – pure data structure for fast full-text search (no Effect, no vscode)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexedDocument {
  readonly id: number
  readonly commandId: string
  readonly label: string
  readonly tokens: readonly string[]
}

export interface PostingEntry {
  readonly docId: number
  readonly termFrequency: number
}

export interface InvertedIndex {
  readonly documents: readonly IndexedDocument[]
  readonly postings: ReadonlyMap<string, readonly PostingEntry[]>
  readonly sortedTokens: readonly string[]
  readonly documentCount: number
  readonly avgDocLength: number
}

export interface ScoredHit {
  readonly docId: number
  readonly commandId: string
  readonly label: string
  readonly score: number
}

// ---------------------------------------------------------------------------
// Tokenize (mirrors RegistryService.tokenize)
// ---------------------------------------------------------------------------

export const tokenize = (text: string): string[] =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._\-:]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)

// ---------------------------------------------------------------------------
// Build Index
// ---------------------------------------------------------------------------

export const buildIndex = (
  commands: { id: string; label: string }[]
): InvertedIndex => {
  const documents: IndexedDocument[] = new Array(commands.length)
  const postings = new Map<string, PostingEntry[]>()
  let totalTokens = 0

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]
    const tokens = tokenize(cmd.label + " " + cmd.id)
    documents[i] = {
      id: i,
      commandId: cmd.id,
      label: cmd.label,
      tokens,
    }
    totalTokens += tokens.length

    // Count term frequencies for this document
    const freqs = new Map<string, number>()
    for (let j = 0; j < tokens.length; j++) {
      const t = tokens[j]
      freqs.set(t, (freqs.get(t) ?? 0) + 1)
    }

    // Append to posting lists
    freqs.forEach((tf, token) => {
      let list = postings.get(token)
      if (list === undefined) {
        list = []
        postings.set(token, list)
      }
      list.push({ docId: i, termFrequency: tf })
    })
  }

  // Posting lists are already sorted by docId because we iterate commands in order
  const sortedTokens = Array.from(postings.keys()).sort()

  return {
    documents,
    postings,
    sortedTokens,
    documentCount: commands.length,
    avgDocLength: commands.length > 0 ? totalTokens / commands.length : 0,
  }
}

// ---------------------------------------------------------------------------
// Min-Heap for top-K selection
// ---------------------------------------------------------------------------

export class MinHeap {
  readonly items: ScoredHit[]
  private readonly capacity: number
  private size: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.items = []
    this.size = 0
  }

  push(item: ScoredHit): void {
    if (this.size < this.capacity) {
      this.items.push(item)
      this.size++
      this._siftUp(this.size - 1)
    } else if (this.size > 0 && item.score > this.items[0].score) {
      this.items[0] = item
      this._siftDown(0)
    }
  }

  toSorted(): ScoredHit[] {
    return this.items.slice().sort((a, b) => b.score - a.score)
  }

  private _siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.items[i].score < this.items[parent].score) {
        const tmp = this.items[i]
        this.items[i] = this.items[parent]
        this.items[parent] = tmp
        i = parent
      } else {
        break
      }
    }
  }

  private _siftDown(i: number): void {
    const n = this.size
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n && this.items[left].score < this.items[smallest].score) {
        smallest = left
      }
      if (right < n && this.items[right].score < this.items[smallest].score) {
        smallest = right
      }
      if (smallest !== i) {
        const tmp = this.items[i]
        this.items[i] = this.items[smallest]
        this.items[smallest] = tmp
        i = smallest
      } else {
        break
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Search Index (BM25)
// ---------------------------------------------------------------------------

const BM25_K1 = 1.2
const BM25_B = 0.75
const MAX_PREFIX_EXPANSIONS = 64

export const searchIndex = (
  index: InvertedIndex,
  query: string,
  topK: number
): ScoredHit[] => {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0 || index.documentCount === 0) {
    return []
  }

  const N = index.documentCount
  const avgDl = index.avgDocLength

  // Resolve posting lists for each query token (with prefix expansion)
  const termPostings: { list: readonly PostingEntry[]; df: number }[] = []

  for (const qt of queryTokens) {
    const exact = index.postings.get(qt)
    if (exact !== undefined) {
      termPostings.push({ list: exact, df: exact.length })
    } else {
      // Prefix expansion via binary search on sorted tokens
      const expanded: PostingEntry[] = []
      const mergedDocs = new Set<number>()
      let expansions = 0

      // Binary search for first token >= qt
      let lo = 0, hi = index.sortedTokens.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (index.sortedTokens[mid] < qt) lo = mid + 1
        else hi = mid
      }

      // Walk forward while tokens start with qt
      for (let i = lo; i < index.sortedTokens.length; i++) {
        const key = index.sortedTokens[i]
        if (!key.startsWith(qt)) break
        const list = index.postings.get(key)!
        for (const entry of list) {
          if (!mergedDocs.has(entry.docId)) {
            mergedDocs.add(entry.docId)
            expanded.push(entry)
          }
        }
        expansions++
        if (expansions >= MAX_PREFIX_EXPANSIONS) break
      }

      if (expanded.length > 0) {
        termPostings.push({ list: expanded, df: expanded.length })
      }
    }
  }

  if (termPostings.length === 0) {
    return []
  }

  // Score candidate documents
  const scores = new Map<number, number>()

  for (const { list, df } of termPostings) {
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)

    for (const entry of list) {
      const dl = index.documents[entry.docId].tokens.length
      const tfNorm =
        (entry.termFrequency * (BM25_K1 + 1)) /
        (entry.termFrequency + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgDl)))
      const contribution = idf * tfNorm
      scores.set(entry.docId, (scores.get(entry.docId) ?? 0) + contribution)
    }
  }

  // Select top K using min-heap
  const heap = new MinHeap(topK)
  scores.forEach((score, docId) => {
    const doc = index.documents[docId]
    heap.push({
      docId,
      commandId: doc.commandId,
      label: doc.label,
      score,
    })
  })

  return heap.toSorted()
}
