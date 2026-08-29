<script setup lang="ts">
import { ref } from 'vue'
import TabSelectorButton from './TabSelectorButton.vue'
import { useTimelineStore } from '../../../stores/timelineStore';
import FilterButton from '../FilterButton.vue';
const timelineStore = useTimelineStore()

const labels = ["人気","最新"]
const selectedLabel = ref(labels[1])

const selectTab = (label: string) => {
    if(selectedLabel.value != label){
        timelineStore.toggleSort()
    }
    selectedLabel.value = label
}
</script>

<template>
    <div class="container">
        <div class="selector">
            <TabSelectorButton
                v-for="label in labels"
                :key="label"
                :label="label"
                :selected="label === selectedLabel"
                :selectHandler="selectTab"
            />
        </div>
        <FilterButton :isFiltered="false"/>
    </div>
</template>
<style scoped>
.container{
    display: flex;
    align-items: center;
}
.selector{
    width:100%;
    padding:6px 21px;

    display:flex;
    justify-content: center;
    gap:32px;
}
</style>