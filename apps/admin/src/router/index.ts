import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@/views/DashboardPage.vue'
import ApiPanel from '@/views/ApiPanel.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: DashboardPage },
    { path: '/api/:group?', component: ApiPanel },
  ],
})
