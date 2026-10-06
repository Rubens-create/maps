import { createRouter, createWebHashHistory } from 'vue-router'
import FavoritesPage from '@/views/FavoritesPage.vue'
import HomePage from '@/views/HomePage.vue'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/favoritos', name: 'favoritos', component: FavoritesPage },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
