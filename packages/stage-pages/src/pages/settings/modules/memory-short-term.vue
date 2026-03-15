<script setup lang="ts">
import { useMemoryStore } from '@proj-airi/stage-ui/stores/memory'
import { computed, ref } from 'vue'

const memoryStore = useMemoryStore()

const searchQuery = ref('')
const newMemory = ref('')
const newMemoryType = ref<'conversation' | 'fact' | 'preference' | 'event' | 'vision'>('fact')

const recentMemories = computed(() => memoryStore.recent(20))
const filteredMemories = computed(() => {
  if (!searchQuery.value)
    return recentMemories.value
  return memoryStore.recall({ query: searchQuery.value, limit: 20 })
})

function addMemory() {
  if (!newMemory.value.trim())
    return
  memoryStore.remember(newMemory.value.trim(), newMemoryType.value, { importance: 0.7 })
  newMemory.value = ''
}

function deleteMemory(id: string) {
  memoryStore.forget(id)
}

function clearAll() {
  if (confirm('Clear all memories? This cannot be undone.'))
    memoryStore.clearAll()
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
    <!-- Stats -->
    <div class="flex gap-4 text-sm">
      <div class="rounded-lg bg-[var(--color-bg-soft)] p-3">
        <div class="text-2xl font-bold">{{ memoryStore.totalMemories }}</div>
        <div class="text-[var(--color-text-muted)]">Total Memories</div>
      </div>
    </div>

    <!-- Add Memory -->
    <div class="rounded-lg bg-[var(--color-bg-soft)] p-4 space-y-3">
      <div class="text-sm font-medium">Add Memory</div>
      <div class="flex gap-2">
        <select v-model="newMemoryType" class="rounded bg-[var(--color-bg)] px-3 py-2 text-sm">
          <option value="fact">Fact</option>
          <option value="preference">Preference</option>
          <option value="event">Event</option>
          <option value="conversation">Conversation</option>
          <option value="vision">Vision</option>
        </select>
        <input
          v-model="newMemory"
          type="text"
          placeholder="Enter something to remember..."
          class="flex-1 rounded bg-[var(--color-bg)] px-3 py-2 text-sm"
          @keyup.enter="addMemory"
        />
        <button
          class="rounded bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500"
          @click="addMemory"
        >
          Remember
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="flex gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search memories..."
        class="flex-1 rounded bg-[var(--color-bg-soft)] px-3 py-2 text-sm"
      />
      <button
        class="rounded bg-red-600/20 px-4 py-2 text-sm text-red-300 hover:bg-red-600/30"
        @click="clearAll"
      >
        Clear All
      </button>
    </div>

    <!-- Memory List -->
    <div class="space-y-2">
      <div
        v-for="memory in filteredMemories"
        :key="memory.id"
        class="rounded-lg bg-[var(--color-bg-soft)] p-3 flex items-start justify-between gap-3"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span :class="typeColors[memory.type]" class="rounded px-2 py-0.5 text-xs font-medium">
              {{ memory.type }}
            </span>
            <span class="text-xs text-[var(--color-text-muted)]">
              {{ new Date(memory.createdAt).toLocaleDateString() }}
            </span>
            <span class="text-xs text-[var(--color-text-muted)]">
              Importance: {{ (memory.importance * 100).toFixed(0) }}%
            </span>
          </div>
          <div class="text-sm">{{ memory.content }}</div>
        </div>
        <button
          class="text-red-400 hover:text-red-300 text-sm"
          @click="deleteMemory(memory.id)"
        >
          ✕
        </button>
      </div>

      <div v-if="filteredMemories.length === 0" class="text-center text-[var(--color-text-muted)] py-8">
        {{ searchQuery ? 'No matching memories' : 'No memories yet. Add one above.' }}
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.memory-short-term.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
</script>
