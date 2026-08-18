import { createRouter, createWebHistory } from 'vue-router'

import BookmarkView from './views/BookmarkView.vue'
import TimelineView from './views/TimelineView.vue'

export default createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', name: 'timeline', component: TimelineView },
        { path: '/profile', name: 'profile', component: BookmarkView },
    ],
})
