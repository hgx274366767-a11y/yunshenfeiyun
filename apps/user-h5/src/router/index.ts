import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/home/HomeView.vue'),
      meta: { requiresAuth: true, title: '首页', showTabbar: true },
    },
    {
      path: '/order/create',
      name: 'CreateOrder',
      component: () => import('@/views/orders/CreateOrderView.vue'),
      meta: { requiresAuth: true, title: '发布吊运需求' },
    },
    {
      path: '/orders',
      name: 'OrderList',
      component: () => import('@/views/orders/OrderListView.vue'),
      meta: { requiresAuth: true, title: '我的订单', showTabbar: true },
    },
    {
      path: '/orders/:id',
      name: 'OrderDetail',
      component: () => import('@/views/orders/OrderDetailView.vue'),
      meta: { requiresAuth: true, title: '订单详情' },
    },
    {
      path: '/services',
      name: 'Services',
      component: () => import('@/views/services/ServicesView.vue'),
      meta: { requiresAuth: false, title: '服务项目' },
    },
    {
      path: '/services/:type',
      name: 'ServiceDetail',
      component: () => import('@/views/services/ServiceDetailView.vue'),
      meta: { requiresAuth: false, title: '服务详情' },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/profile/ProfileView.vue'),
      meta: { requiresAuth: true, title: '我的', showTabbar: true },
    },
    {
      path: '/terms',
      name: 'Terms',
      component: () => import('@/views/legal/TermsView.vue'),
      meta: { requiresAuth: false, title: '用户服务协议' },
    },
    {
      path: '/privacy',
      name: 'Privacy',
      component: () => import('@/views/legal/PrivacyView.vue'),
      meta: { requiresAuth: false, title: '隐私政策' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 初始化认证状态（仅首次）
  if (!authStore.isAuthenticated && !authStore.loading) {
    await authStore.init()
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  }
  else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Home' })
  }
  else {
    next()
  }
})

// 更新页面标题
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - 云深飞运` : '云深飞运 - 用户端'
})

export default router
