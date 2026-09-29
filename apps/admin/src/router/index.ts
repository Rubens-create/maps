import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@/views/DashboardPage.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', component: DashboardPage }],
})
