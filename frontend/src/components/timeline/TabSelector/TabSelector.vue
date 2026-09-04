<script setup lang="ts">
import { ref } from 'vue'
import TabSelectorButton from './TabSelectorButton.vue'
import { useTimelineStore } from '../../../stores/timelineStore'
const timelineStore = useTimelineStore()

const labels = ['人気', '最新']
const selectedLabel = ref(labels[1])

const selectTab = (label: string) => {
    if (selectedLabel.value != label) {
        timelineStore.toggleSort()
    }
    selectedLabel.value = label
}
</script>

<template>
    <div class="selector">
        <TabSelectorButton
            v-for="label in labels"
            :key="label"
            :label="label"
            :selected="label === selectedLabel"
            :selectHandler="selectTab"
        />
    </div>
</template>
<style scoped>
.selector {
    width: 100%;
    /* 高さはヘッダー（--header-height）に従うので縦のパディングは持たない */
    padding: 0 21px;

    display: flex;
    justify-content: center;
    gap: 32px;
}
</style>
