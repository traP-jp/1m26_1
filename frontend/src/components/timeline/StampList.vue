<script setup lang="ts">
import type { traQcomponents } from '../../types/traq'
import { useStampStore } from '../../stores/stampStore'

defineProps<{
  stamps: traQcomponents['schemas']['MessageStamp'][]
}>()

const stampStore = useStampStore()
</script>

<template>
  <div v-if="stamps.length" class="stamp-list">
    <span
      v-for="stamp in stamps"
      :key="stamp.stampId"
      class="stamp-item"
    >
      <span
        v-if="stampStore.getStamp(stamp.stampId)?.isUnicode"
        class="stamp-emoji"
      >
        {{ stampStore.getStampDisplayName(stamp.stampId) }}
      </span>
      <img
        v-else-if="stampStore.getStampImageUrl(stamp.stampId)"
        :src="stampStore.getStampImageUrl(stamp.stampId)"
        alt="stamp"
        class="stamp-image"
        referrerpolicy="no-referrer"
        loading="lazy"
        @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
      />
      <span v-else class="stamp-name-fallback">
        :{{ stampStore.getStamp(stamp.stampId)?.name || '?' }}:
      </span>
      <span class="stamp-count">{{ stamp.count }}</span>
    </span>
  </div>
</template>

<style scoped>
.stamp-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.stamp-item {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #f0f2f5;
  padding: 2px 10px 2px 6px;
  border-radius: 30px;
  font-size: 14px;
  border: 1px solid #eef0f3;
}
.stamp-emoji {
  font-size: 16px;
}
.stamp-image {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
}
.stamp-name-fallback {
  font-size: 12px;
  color: #6b7a8f;
}
.stamp-count {
  font-size: 12px;
  font-weight: 600;
  color: #6b7a8f;
  min-width: 16px;
  text-align: center;
}
</style>
