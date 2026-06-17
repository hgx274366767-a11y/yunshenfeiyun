import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '仪表盘' },
        },
        {
          path: 'pilots',
          name: 'Pilots',
          component: () => import('@/views/PilotListView.vue'),
          meta: { title: '飞手管理' },
        },
        {
          path: 'pilots/:id',
          name: 'PilotDetail',
          component: () => import('@/views/PilotDetailView.vue'),
          meta: { title: '飞手详情' },
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/OrderListView.vue'),
          meta: { title: '订单管理' },
        },
        {
          path: 'orders/:id',
          name: 'OrderDetail',
          component: () => import('@/views/OrderDetailView.vue'),
          meta: { title: '订单详情' },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/UserListView.vue'),
          meta: { title: '用户管理' },
        },
        {
          path: 'flight-records',
          name: 'FlightRecords',
          component: () => import('@/views/FlightRecordListView.vue'),
          meta: { title: '飞行记录' },
        },
        {
          path: 'config',
          name: 'Config',
          component: () => import('@/views/ConfigView.vue'),
          meta: { title: '系统配置' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (authStore.loading) {
    await authStore.init()
  }

  if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && authStore.isLoggedIn) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - 云深飞运管理后台` : '云深飞运 - 管理后台'
})

export default router
