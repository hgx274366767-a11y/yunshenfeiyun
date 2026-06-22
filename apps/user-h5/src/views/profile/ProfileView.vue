<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrdersStore } from '@/stores/orders'

const router = useRouter()
const authStore = useAuthStore()
const orderStore = useOrdersStore()

const orderStats = ref({
  pending: 0,
  active: 0,
  completed: 0,
})

onMounted(async () => {
  await orderStore.fetchOrders()
  const pending = orderStore.orders.filter(o => o.status === 'pending').length
  const active = orderStore.orders.filter(o => ['accepted', 'in_flight', 'picked_up'].includes(o.status)).length
  const completed = orderStore.orders.filter(o => o.status === 'completed').length
  orderStats.value = { pending, active, completed }
})

function goToOrders() {
  router.push('/orders')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function getPhoneDisplay(): string {
  const phone = authStore.user?.phone || ''
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}****${phone.slice(7)}`
  }
  return phone
}
</script>

<template>
  <div class="profile-page page-with-tabbar">
    <!-- Hero 区域 -->
    <div class="profile-hero">
      <div class="profile-hero-content">
        <div class="profile-avatar">
          <span class="profile-avatar-text">{{ authStore.user?.phone?.slice(-1) || '?' }}</span>
        </div>
        <div class="profile-info">
          <div class="profile-name">{{ getPhoneDisplay() }}</div>
          <div class="profile-badge">认证用户</div>
        </div>
      </div>
    </div>

    <!-- 订单统计 -->
    <div class="profile-stats-card">
      <div class="section-label">我的订单</div>
      <div class="profile-stats-grid">
        <div class="profile-stat-item" @click="goToOrders">
          <div class="profile-stat-value">{{ orderStats.pending }}</div>
          <div class="profile-stat-label">待付款</div>
        </div>
        <div class="profile-stat-item" @click="goToOrders">
          <div class="profile-stat-value" style="color: $color-primary;">{{ orderStats.active }}</div>
          <div class="profile-stat-label">进行中</div>
        </div>
        <div class="profile-stat-item" @click="goToOrders">
          <div class="profile-stat-value" style="color: $color-success;">{{ orderStats.completed }}</div>
          <div class="profile-stat-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 订单管理 -->
    <div class="profile-section">
      <div class="profile-section-label">订单管理</div>
      <div class="profile-menu-item" @click="goToOrders">
        <div class="icon-box blue">
          <van-icon name="records" />
        </div>
        <div class="profile-menu-content">
          <div class="profile-menu-title">全部订单</div>
          <div class="profile-menu-desc">查看历史吊运记录</div>
        </div>
        <van-icon name="arrow" color="#D1D5DB" />
      </div>
    </div>

    <!-- 服务支持 -->
    <div class="profile-section">
      <div class="profile-section-label">服务支持</div>
      <div class="profile-menu-item">
        <div class="icon-box green">
          <van-icon name="service-o" />
        </div>
        <div class="profile-menu-content">
          <div class="profile-menu-title">联系客服</div>
          <div class="profile-menu-desc">7×24小时在线服务</div>
        </div>
        <van-icon name="arrow" color="#D1D5DB" />
      </div>
      <div class="profile-menu-item">
        <div class="icon-box blue">
          <van-icon name="info-o" />
        </div>
        <div class="profile-menu-content">
          <div class="profile-menu-title">关于云深飞运</div>
          <div class="profile-menu-desc">了解平台与服务资质</div>
        </div>
        <van-icon name="arrow" color="#D1D5DB" />
      </div>
      <div class="profile-menu-item" @click="handleLogout">
        <div class="icon-box orange">
          <van-icon name="cross" />
        </div>
        <div class="profile-menu-content">
          <div class="profile-menu-title" style="color: $color-danger;">退出登录</div>
        </div>
        <van-icon name="arrow" color="#D1D5DB" />
      </div>
    </div>

    <!-- 版权 -->
    <div class="profile-footer">
      <div class="profile-footer-brand">云深飞运</div>
      <div class="profile-footer-copy">云深织梦（重庆）科技有限公司</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: $color-bg-page;
}

// Hero 区域
.profile-hero {
  background: linear-gradient(150deg, #0B1D3A 0%, $color-primary 60%, $color-primary-light 100%);
  padding: $spacing-2xl $spacing-xl $spacing-3xl;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -30%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.profile-hero-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 10;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, $color-warning 0%, #D97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.profile-avatar-text {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}

.profile-badge {
  display: inline-block;
  background: $color-warning;
  color: #000;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

// 订单统计
.profile-stats-card {
  margin: -20px 16px 12px;
  background: white;
  border-radius: $radius-xl;
  padding: 16px;
  box-shadow: $shadow-lg;
  position: relative;
  z-index: 10;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: $color-text-placeholder;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 14px;
}

.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
}

.profile-stat-item {
  cursor: pointer;
  padding: 8px 0;

  &:hover {
    background: $color-bg-page;
    border-radius: 8px;
  }
}

.profile-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: $color-text-placeholder;
  margin-bottom: 4px;
}

.profile-stat-label {
  font-size: 12px;
  color: $color-text-placeholder;
}

// 区块
.profile-section {
  margin: 0 16px 12px;
  background: white;
  border-radius: $radius-xl;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.profile-section-label {
  font-size: 11px;
  font-weight: 600;
  color: $color-text-placeholder;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 14px 16px 0;
}

.profile-menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: $color-bg-page;
  }

  &:active {
    background: #E5E7EB;
  }
}

.profile-menu-content {
  flex: 1;
  min-width: 0;
}

.profile-menu-title {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 2px;
}

.profile-menu-desc {
  font-size: 12px;
  color: $color-text-placeholder;
}

// 版权
.profile-footer {
  text-align: center;
  padding: 24px 16px 40px;
}

.profile-footer-brand {
  font-size: 14px;
  font-weight: 700;
  color: $color-text-placeholder;
  letter-spacing: 1px;
}

.profile-footer-copy {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.2);
  margin-top: 4px;
}
</style>
