import type { ContextMessage } from '../context-store'

export function createMemoryContext(memories: string): ContextMessage | null {
  if (!memories)
    return null

  return {
    key: 'memory',
    source: 'memory-store',
    content: memories,
    metadata: {},
  }
}
