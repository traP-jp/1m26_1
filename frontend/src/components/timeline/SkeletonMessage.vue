<template>
    <article class="message-item">
        <div class="avatar">
        </div>
        <div class="message-area">
            <div class="header">
                <div></div>
                <div></div>
            </div>
            <div class="body">
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>
    </article>
</template>
<style scoped>
.message-item {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--surface-border-secondary);
    transform: scale(1.03); /* まさかの錯視調整 */
}
.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--surface-secondary);
}
.message-area {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    gap: 8px;
}
.header > div{
    width: 100%;
    height:12px;
    margin-bottom:9px;
    background-color: var(--surface-secondary);
    border-radius: 4px;
}
.header > div:nth-child(2){
    width:50%;
}
.body > div{
    width: 100%;
    height:16px;
    margin-bottom:4px;
    background-color: var(--surface-secondary);
    border-radius: 4px;
}
.body > div:last-child{
    margin-bottom: 12px;
}
</style>
