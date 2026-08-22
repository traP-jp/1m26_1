<script setup lang="ts">
const props = defineProps<{
    label: string
    selected: boolean
    selectHandler: (label: string) => void
}>()

const onLabelClick = () => {
    props.selectHandler(props.label)
    window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
    <button
        :class="`${selected ? 'selected button' : 'button'} `"
        @click="onLabelClick"
    >
        {{ label }}
    </button>
</template>

<style scoped>
button{
    position:relative;
    border:none;
    width:80px;
    height:34px;
    background-color: transparent;
    cursor: pointer;
    color:var(--text-secondary);
    font-size: var(--text-size-m);
    font-weight: 500;
}
.selected{
    color:var(--text-primary)
}
.selected::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 4px; 
  border-radius: 10px;      /* 線の太さ */
  background: var(--color-primary);   /* 線の色 */
}
</style>
