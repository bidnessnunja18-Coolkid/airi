/**
 * Local Memory Store for AIRI
 *
 * A browser-based memory system that doesn't require Telegram or external services.
 * Uses localStorage for persistence and provides RAG-like recall functionality.
 */

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Memory types
export type MemoryType = 'conversation' | 'fact' | 'preference' | 'event' | 'vision'

export interface MemoryEntry {
  id: string
  content: string
  type: MemoryType
  importance: number // 0-1, affects decay rate
  createdAt: number
  lastAccessedAt: number
  accessCount: number
  metadata?: Record<string, unknown>
  tags?: string[]
}

export interface MemorySearchParams {
  query: string
  limit?: number
  types?: MemoryType[]
  tags?: string[]
  minImportance?: number
  since?: number
}

// Simple text similarity using word overlap
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2))

  if (wordsA.size === 0 || wordsB.size === 0)
    return 0

  let intersection = 0
  for (const word of wordsA) {
    if (wordsB.has(word))
      intersection++
  }

  return intersection / Math.sqrt(wordsA.size * wordsB.size)
}

// Time-based relevance decay
function timeRelevance(createdAt: number, now: number): number {
  const ageHours = (now - createdAt) / (1000 * 60 * 60)
  // Decay factor: recent memories are more relevant
  return Math.exp(-ageHours / 24) // Half-life of 24 hours
}

export const useMemoryStore = defineStore('memory', () => {
  // Persist memories to localStorage
  const memories = useLocalStorageManualReset<MemoryEntry[]>('airi-memories', [])
  const maxMemories = ref(1000)

  // Statistics
  const totalMemories = computed(() => memories.value.length)
  const memoriesByType = computed(() => {
    const counts: Record<string, number> = {}
    for (const m of memories.value) {
      counts[m.type] = (counts[m.type] || 0) + 1
    }
    return counts
  })

  // Add a new memory
  function remember(
    content: string,
    type: MemoryType = 'conversation',
    options?: {
      importance?: number
      metadata?: Record<string, unknown>
      tags?: string[]
    },
  ): MemoryEntry {
    const now = Date.now()
    const entry: MemoryEntry = {
      id: `mem-${now}-${Math.random().toString(36).slice(2, 9)}`,
      content,
      type,
      importance: options?.importance ?? 0.5,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      metadata: options?.metadata,
      tags: options?.tags,
    }

    memories.value.push(entry)

    // Prune if over limit
    if (memories.value.length > maxMemories.value) {
      pruneMemories()
    }

    return entry
  }

  // Search memories with relevance scoring
  function recall(params: MemorySearchParams): MemoryEntry[] {
    const { query, limit = 10, types, tags, minImportance = 0, since } = params
    const now = Date.now()

    // Filter
    let filtered = memories.value.filter((m) => {
      if (types && !types.includes(m.type))
        return false
      if (tags && !tags.some(t => m.tags?.includes(t)))
        return false
      if (m.importance < minImportance)
        return false
      if (since && m.createdAt < since)
        return false
      return true
    })

    // Score
    const scored = filtered.map((m) => {
      const similarity = textSimilarity(query, m.content)
      const timeRel = timeRelevance(m.createdAt, now)
      const importance = m.importance
      const accessBoost = Math.log(m.accessCount + 1) * 0.1

      const score = (similarity * 0.5) + (timeRel * 0.3) + (importance * 0.15) + accessBoost

      return { memory: m, score }
    })

    // Sort and return
    scored.sort((a, b) => b.score - a.score)

    const results = scored.slice(0, limit).map((s) => {
      // Update access stats
      s.memory.lastAccessedAt = now
      s.memory.accessCount++
      return s.memory
    })

    return results
  }

  // Get recent memories
  function recent(limit = 10, type?: MemoryType): MemoryEntry[] {
    let filtered = memories.value
    if (type) {
      filtered = filtered.filter(m => m.type === type)
    }
    return [...filtered]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }

  // Forget a specific memory
  function forget(id: string): boolean {
    const idx = memories.value.findIndex(m => m.id === id)
    if (idx === -1)
      return false
    memories.value.splice(idx, 1)
    return true
  }

  // Clear all memories
  function clearAll(): void {
    memories.value = []
  }

  // Prune low-importance or old memories
  function pruneMemories(): void {
    const now = Date.now()

    // Sort by composite score
    const scored = memories.value.map((m) => {
      const timeRel = timeRelevance(m.createdAt, now)
      const score = (m.importance * 0.6) + (timeRel * 0.3) + (Math.log(m.accessCount + 1) * 0.1)
      return { memory: m, score }
    })

    scored.sort((a, b) => b.score - a.score)

    // Keep top memories
    memories.value = scored.slice(0, maxMemories.value).map(s => s.memory)
  }

  // Update memory importance
  function emphasize(id: string, delta: number): boolean {
    const memory = memories.value.find(m => m.id === id)
    if (!memory)
      return false
    memory.importance = Math.max(0, Math.min(1, memory.importance + delta))
    return true
  }

  // Get context string for LLM
  function getContextString(query?: string, limit = 5): string {
    let relevantMemories: MemoryEntry[]

    if (query) {
      relevantMemories = recall({ query, limit })
    }
    else {
      relevantMemories = recent(limit)
    }

    if (relevantMemories.length === 0)
      return ''

    const lines = relevantMemories.map((m) => {
      const date = new Date(m.createdAt).toLocaleDateString()
      return `[${date}] ${m.content}`
    })

    return `Relevant memories:\n${lines.join('\n')}`
  }

  return {
    memories,
    maxMemories,
    totalMemories,
    memoriesByType,

    remember,
    recall,
    recent,
    forget,
    clearAll,
    pruneMemories,
    emphasize,
    getContextString,
  }
})
