<script setup lang="ts">
import { useMemoryStore } from '@proj-airi/stage-ui/stores/memory'
import { computed, ref } from 'vue'

const memoryStore = useMemoryStore()

const searchQuery = ref('')
const minImportance = ref(0.7)

// Long-term = high importance memories
const longTermMemories = computed(() => {
  const all = memoryStore.memories.filter(m => m.importance >= minImportance.value)
  if (!searchQuery.value)
    return all.sort((a, b) => b.importance - a.importance).slice(0, 50)
  return memoryStore.recall({ query: searchQuery.value, limit: 50, minImportance: minImportance.value })
})

function emphasize(id: string) {
  memoryStore.emphasize(id, 0.1)
}

function diminish(id: string) {
  memoryStore.emphasize(id, -0.1)
}

const typeColors: Record<string, string> = {
  conversation: 'bg-blue-500/20 text-blue-300',
  fact: 'bg-green-500/20 text-green-300',
  preference: 'bg-purple-500/20 text-purple-300',
  event: 'bg-yellow-500/20 text-yellow-300',
  vision: 'bg-pink-500/20 text-pink-300',
}
</script>

<template>
  <div class="space-y-4">
    <!-- Info -->
    <div class="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
      <div class="text-sm text-purple-300">
        Long-term memories are high-importance items that persist. Memories with importance ≥ 70% appear here.
        Importance increases when memories are recalled or manually emphasized.
      </div>
    </div>

    <!-- Stats -->
    <div class="flex gap-4 text-sm">
      <div class="rounded-lg bg-[var(--color-bg-soft)] p-3">
        <div class="text-2xl font-bold">{{ longTermMemories.length }}</div>
        <div class="text-[var(--color-text-muted)]">Long-term Memories</div>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="flex gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search long-term memories..."
        class="flex-1 rounded bg-[var(--color-bg-soft)] px-3 py-2 text-sm"
      />
      <div class="flex items-center gap-2 text-sm">
        <span class="text-[var(--color-text-muted)]">Min importance:</span>
        <input
          v-model.number="minImportance"
          type="range"
          min="0"
          max="1"
          step="0.1"
          class="w-24"
        />
        <span>{{ (minImportance * 100).toFixed(0) }}%</span>
      </div>
    </div>

    <!-- Memory List -->
    <div class="space-y-2">
      <div
        v-for="memory in longTermMemories"
        :key="memory.id"
        class="rounded-lg bg-[var(--color-bg-soft)] p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span :class="typeColors[memory.type]" class="rounded px-2 py-0.5 text-xs font-medium">
                {{ memory.type }}
              </span>
              <span class="text-xs text-[var(--color-text-muted)]">
                {{ new Date(memory.createdAt).toLocaleDateString() }}
              </span>
              <span class="text-xs text-[var(--color-text-muted)]">
                Accessed {{ memory.accessCount }}x
              </span>
            </div>
            <div class="text-sm">{{ memory.content }}</div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <div class="text-sm font-medium">{{ (memory.importance * 100).toFixed(0) }}%</div>
            <div class="flex gap-1">
              <button
                class="text-xs text-green-400 hover:text-green-300 px-1"
                @click="emphasize(memory.id)"
              >
                +boost
              </button>
              <button
                class="text-xs text-red-400 hover:text-red-300 px-1"
                @click="diminish(memory.id)"
              >
                -reduce
              </button>
            </div>
          </div>
        </div>
        <div class="mt-2 h-1 bg-[var(--color-bg)] rounded overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            :style="{ width: `${memory.importance * 100}%` }"
          />
        </div>
      </div>

      <div v-if="longTermMemories.length === 0" class="text-center text-[var(--color-text-muted)] py-8">
        {{ searchQuery ? 'No matching memories' : 'No long-term memories yet. Important memories will appear here.' }}
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.memory-long-term.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
