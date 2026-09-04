<template>
    <div class="profile-header">
        <div class="arrow" @click="router.push('../')">
            <div class="arrow-1"></div>
            <div class="arrow-2"></div>
            <div class="arrow-3"></div>
        </div>
        <div>
            <p class="header-username">ユーザーネーム</p>
            <p class="header-number-of-posts">100000件の投稿</p>
        </div>
        <svg class="settings-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" fill="none">
<g transform="translate(-351, -13)">
<path d="M364.222 33.8333L364.472 35.125C364.537 35.4397 364.688 35.6921 364.924 35.8821C365.16 36.0718 365.435 36.1667 365.75 36.1667H366.25C366.565 36.1667 366.84 36.0649 367.076 35.8613C367.312 35.6574 367.463 35.3981 367.528 35.0833L367.778 33.8333C368.259 33.6758 368.678 33.4883 369.035 33.2708C369.391 33.0533 369.732 32.7964 370.055 32.5L371.514 32.9583C371.838 33.0508 372.146 33.0324 372.438 32.9029C372.729 32.7732 372.954 32.5649 373.111 32.2779L373.333 31.8888C373.491 31.574 373.533 31.2546 373.458 30.9304C373.384 30.6065 373.204 30.3474 372.917 30.1529L371.917 29.4446C372.009 28.926 372.055 28.4444 372.055 28C372.055 27.5556 372.009 27.074 371.917 26.5554L372.917 25.8471C373.204 25.6526 373.384 25.3911 373.458 25.0625C373.533 24.7339 373.491 24.4214 373.333 24.125L373.097 23.7221C372.94 23.4351 372.718 23.2268 372.43 23.0971C372.143 22.9676 371.838 22.9492 371.514 23.0417L370.055 23.5C369.732 23.2036 369.391 22.9467 369.035 22.7292C368.678 22.5117 368.259 22.3242 367.778 22.1667L367.528 20.875C367.463 20.5603 367.312 20.3079 367.076 20.1179C366.84 19.9282 366.565 19.8333 366.25 19.8333H365.75C365.435 19.8333 365.16 19.9351 364.924 20.1388C364.688 20.3426 364.537 20.6019 364.472 20.9167L364.222 22.1667C363.741 22.3242 363.322 22.5117 362.965 22.7292C362.609 22.9467 362.268 23.2036 361.945 23.5L360.486 23.0417C360.162 22.9492 359.854 22.9676 359.562 23.0971C359.271 23.2268 359.046 23.4351 358.889 23.7221L358.667 24.1112C358.509 24.426 358.468 24.7454 358.542 25.0696C358.616 25.3935 358.796 25.6526 359.083 25.8471L360.083 26.5554C359.991 27.074 359.945 27.5556 359.945 28C359.945 28.4444 359.991 28.926 360.083 29.4446L359.083 30.1529C358.796 30.3474 358.616 30.6089 358.542 30.9375C358.468 31.2661 358.509 31.5786 358.667 31.875L358.903 32.2779C359.06 32.5649 359.282 32.7732 359.57 32.9029C359.857 33.0324 360.162 33.0508 360.486 32.9583L361.945 32.5C362.268 32.7964 362.609 33.0533 362.965 33.2708C363.322 33.4883 363.741 33.6758 364.222 33.8333ZM363.535 30.4654C362.863 29.794 362.528 28.9722 362.528 28C362.528 27.0278 362.863 26.206 363.535 25.5346C364.206 24.8635 365.028 24.5279 366 24.5279C366.972 24.5279 367.794 24.8635 368.465 25.5346C369.137 26.206 369.472 27.0278 369.472 28C369.472 28.9722 369.137 29.794 368.465 30.4654C367.794 31.1365 366.972 31.4721 366 31.4721C365.028 31.4721 364.206 31.1365 363.535 30.4654ZM353.778 43C353.028 43 352.377 42.7246 351.826 42.1737C351.275 41.6226 351 40.9721 351 40.2221V15.7779C351 15.0279 351.275 14.3774 351.826 13.8263C352.377 13.2754 353.028 13 353.778 13H378.222C378.972 13 379.623 13.2754 380.174 13.8263C380.725 14.3774 381 15.0279 381 15.7779V40.2221C381 40.9721 380.725 41.6226 380.174 42.1737C379.623 42.7246 378.972 43 378.222 43H353.778ZM353.778 40.2221H378.222V15.7779H353.778V40.2221Z" fill="#242433"/>
</g>
</svg>

    </div>

    <div class="profile-image">
        <div class="cover">
            <div class="avatar"></div>
        </div>
    </div>
    <div class="name">
        <p class="user-name">ユーザーネーム</p>
        <p class="id-of-account">@ID_of_account</p>
    </div>
    <div class="profile-text">
        <p>ドパガキは、ショート動画やゲームなどの刺激の強いコンテンツに慣れて、常に強い刺激を求めるようになり、集中力が続かなくなる若年層を揶揄するインターネットスラングである［1］［2］。「ドーパミン中毒のガキ」の略称である［1］。</p>
    </div>
    <div class="menu" ref="menuEl">
        <div class="menu-records" ref="recordsTab" @click="activeTab = 'records'"><p>記録</p></div>
        <div class="menu-posts" ref="postsTab" @click="activeTab = 'posts'"><p>投稿</p></div>
        <div class="underline" :style="{left:`${startLeft}px`, transform: `translateX(${activeTab === 'records' ? 0 : offset}px)`}"></div>
        <div class="menu-subscription"><p>購読のみ</p><svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.02059 16C6.73725 16 6.49975 15.9042 6.30809 15.7125C6.11642 15.5208 6.02059 15.2833 6.02059 15V9L0.220588 1.6C-0.0294118 1.26667 -0.0669118 0.916667 0.108088 0.55C0.283088 0.183333 0.587255 0 1.02059 0H15.0206C15.4539 0 15.7581 0.183333 15.9331 0.55C16.1081 0.916667 16.0706 1.26667 15.8206 1.6L10.0206 9V15C10.0206 15.2833 9.92476 15.5208 9.73309 15.7125C9.54142 15.9042 9.30392 16 9.02059 16H7.02059ZM8.02059 8.3L12.9706 2H3.07059L8.02059 8.3Z" fill="white"/>
</svg>
</div>
    </div>
    <div class="records">
        <h2>全期間</h2>
        <div class="two-squares">
            <div class="square">
                <p class="square-title">投稿数</p>
                <p class="square-value">20000</p>
                <div class="pm">
                    <p class="plus">+5.0%</p>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.6875 2.5625L1.27083 10.9792C1.11806 11.1319 0.944444 11.2049 0.75 11.1979C0.555556 11.191 0.381944 11.1111 0.229167 10.9583C0.0763889 10.8056 0 10.6285 0 10.4271C0 10.2257 0.0763889 10.0486 0.229167 9.89583L8.625 1.5H4.43563C4.22368 1.5 4.04597 1.42854 3.9025 1.28563C3.75917 1.14271 3.6875 0.965625 3.6875 0.754375C3.6875 0.543125 3.75931 0.364583 3.90292 0.21875C4.04653 0.0729167 4.22451 0 4.43688 0H10.4315C10.6438 0 10.8229 0.0718061 10.9688 0.215417C11.1146 0.359028 11.1875 0.537013 11.1875 0.749374V6.74396C11.1875 6.95632 11.116 7.13542 10.9731 7.28125C10.8302 7.42708 10.6531 7.5 10.4419 7.5C10.2306 7.5 10.0521 7.42833 9.90625 7.285C9.76042 7.14153 9.6875 6.96382 9.6875 6.75187V2.5625Z" fill="#58BF35"/>
                    </svg>
            </div>
            </div>
            <div class="square">
                <p class="square-title">もらった<br>スタンプ</p>
                <p class="square-value">20000</p>
                <div class="pm">
                    <p class="minus">-5.0%</p>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.6875 8.63586L1.27083 0.219197C1.11806 0.0664196 0.944444 -0.00649738 0.75 0.000447273C0.555556 0.00739193 0.381944 0.0872526 0.229167 0.24003C0.0763889 0.392808 0 0.569892 0 0.77128C0 0.97267 0.0763889 1.14975 0.229167 1.30253L8.625 9.69836H4.43563C4.22368 9.69836 4.04597 9.76982 3.9025 9.91274C3.75917 10.0557 3.6875 10.2327 3.6875 10.444C3.6875 10.6552 3.75931 10.8338 3.90292 10.9796C4.04653 11.1254 4.22451 11.1984 4.43688 11.1984H10.4315C10.6438 11.1984 10.8229 11.1266 10.9688 10.9829C11.1146 10.8393 11.1875 10.6614 11.1875 10.449V4.45441C11.1875 4.24204 11.116 4.06295 10.9731 3.91711C10.8302 3.77128 10.6531 3.69836 10.4419 3.69836C10.2306 3.69836 10.0521 3.77003 9.90625 3.91336C9.76042 4.05684 9.6875 4.23454 9.6875 4.44649V8.63586Z" fill="#F76767"/>
                    </svg>
                </div>
            </div>
        </div>
        <h2>直近１週間</h2>
        <div class="two-squares">
            <div class="square">
                <p class="square-title">投稿数</p>
                <p class="square-value">20000</p>
                <div class="pm">
                    <p class="plus">+5.0%</p>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.6875 2.5625L1.27083 10.9792C1.11806 11.1319 0.944444 11.2049 0.75 11.1979C0.555556 11.191 0.381944 11.1111 0.229167 10.9583C0.0763889 10.8056 0 10.6285 0 10.4271C0 10.2257 0.0763889 10.0486 0.229167 9.89583L8.625 1.5H4.43563C4.22368 1.5 4.04597 1.42854 3.9025 1.28563C3.75917 1.14271 3.6875 0.965625 3.6875 0.754375C3.6875 0.543125 3.75931 0.364583 3.90292 0.21875C4.04653 0.0729167 4.22451 0 4.43688 0H10.4315C10.6438 0 10.8229 0.0718061 10.9688 0.215417C11.1146 0.359028 11.1875 0.537013 11.1875 0.749374V6.74396C11.1875 6.95632 11.116 7.13542 10.9731 7.28125C10.8302 7.42708 10.6531 7.5 10.4419 7.5C10.2306 7.5 10.0521 7.42833 9.90625 7.285C9.76042 7.14153 9.6875 6.96382 9.6875 6.75187V2.5625Z" fill="#58BF35"/>
                    </svg>
            </div>
            </div>
            <div class="square">
                <p class="square-title">もらった<br>スタンプ</p>
                <p class="square-value">20000</p>
                <div class="pm">
                    <p class="minus">-5.0%</p>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.6875 8.63586L1.27083 0.219197C1.11806 0.0664196 0.944444 -0.00649738 0.75 0.000447273C0.555556 0.00739193 0.381944 0.0872526 0.229167 0.24003C0.0763889 0.392808 0 0.569892 0 0.77128C0 0.97267 0.0763889 1.14975 0.229167 1.30253L8.625 9.69836H4.43563C4.22368 9.69836 4.04597 9.76982 3.9025 9.91274C3.75917 10.0557 3.6875 10.2327 3.6875 10.444C3.6875 10.6552 3.75931 10.8338 3.90292 10.9796C4.04653 11.1254 4.22451 11.1984 4.43688 11.1984H10.4315C10.6438 11.1984 10.8229 11.1266 10.9688 10.9829C11.1146 10.8393 11.1875 10.6614 11.1875 10.449V4.45441C11.1875 4.24204 11.116 4.06295 10.9731 3.91711C10.8302 3.77128 10.6531 3.69836 10.4419 3.69836C10.2306 3.69836 10.0521 3.77003 9.90625 3.91336C9.76042 4.05684 9.6875 4.23454 9.6875 4.44649V8.63586Z" fill="#F76767"/>
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
import { ref, onMounted } from 'vue'
    const menuEl = ref(null)

    const recordsTab = ref(null)
    const postsTab = ref(null)
    const offset = ref(0)
    const activeTab = ref('records')
    const startLeft = ref(0)
    onMounted(() => {
        const m = menuEl.value.getBoundingClientRect()
        const r1 = recordsTab.value.getBoundingClientRect()
        console.log('menu.left', m.left, 'records.left', r1.left)

         const r = recordsTab.value.getBoundingClientRect()
         const p = postsTab.value.getBoundingClientRect()
         const distance = p.left - r.left
         offset.value = distance
         startLeft.value = r.left - m.left - 7.5
    })
</script>

<style>
.arrow{
    transform: scale(0.7);
    margin-right: 20px;
}
.arrow-1{
    width:22px;
    height:5px;
    background:black;
    border-radius: 9999vw;
    transform: translate(-4px,-1px) rotate(-45deg);
}
.arrow-2{
    width:40px;
    height:5px;
    background:black;
    border-radius: 9999vw;
}
.arrow-3{
    width:22px;
    height:5px;
    background:black;
    border-radius: 9999vw;
    transform: rotate(45deg) translate(-1px,4px);
}

.profile-header{
    position: sticky;
    top: 0;
    z-index: 10;
    background: white;
    display: flex;
    align-items: center;
    width:100%;
    height:60px;
    padding: 0 20px;
}

.profile-header > div {
  flex-shrink: 0;   /* 縮まない */
}

.header-username{
    font-weight:bold;
}

.header-number-of-posts{
    font-size:13px;
    color:rgb(85, 85, 85);
}

.header-username,
.header-number-of-posts{
    margin: 0;
}

.settings-icon{
    width: 30px;
    height: 30px;
    display: block;
    margin-left: auto;
}



.profile-image{
    margin: 0;
    padding: 0;
}
.cover{
    width: 100%;
    height: 180px;
    background: rgb(223, 222, 222);
    position: relative;
}

.avatar{
    position: absolute;
    bottom: -50px;
    left:20px;
    width: 100px;
    height: 100px;
    background: black;
    border-radius: 50%;
}
.user-name, .id-of-account{
    margin: 0;
}

.name{
    padding-left: 20px;
    padding-top: 90px;
}

.user-name{
    font-weight: bold;
    font-size: 25px;
}

.id-of-account{
    font-size:15px;
    color: gray;
    margin-top: 5px;
}
.profile-text{
    padding-left: 20px;
    padding-right:20px;
    padding-top: 10px;
}
.profile-text > p{
    margin: 0;
}
.menu{
    display: flex;
    margin: 0;
    width: 100%;
    height: 60px;
    align-items: center;
    position: relative;
}
.menu p {
    margin: 0;
}

.menu-records, .menu-posts, .menu-subscription{
    margin: auto;
}

.menu-subscription{
    display: flex;
    background: #f5b96b;
    padding: 7px 9px 7px 9px;
    align-items: center;
    border-radius: 10px;
}
.menu-subscription > p{
    color: white;
    text-align: center;
}

.menu-subscription > svg{
    margin-left: 5px;
}

.underline{
    position: absolute;
    bottom: 10px;
    width: 50px;
    height: 3px;
    background: #f5b96b;
    transition: transform 0.3s;
}

.records h2{
    margin-left: 20px;
}

.two-squares{
    display: flex;
    gap: 20px;
    justify-content: center;
    padding: 0 20px;
}

.square{
    flex: 1;
    aspect-ratio: 1 / 1;
    border: solid 1px gray;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 200px;

}

.square p{
    text-align: center;
    margin: 0;
    font-size: clamp(14px, 4vw, 24px);
}

.square-title{
    font-size: clamp(14px, 4vw, 24px);
    color: gray;
    height: 2.6em;
    line-height:  1.2;
}

.square-value{
    font-size:30px;
    font-weight: bold;
}

.pm{
    display: flex;
    justify-content: center;
    align-items: center;       
    gap: 4px;
}

.plus{
    color: #58bf35;
}

.minus{
    color: #f76767;
}



</style>
