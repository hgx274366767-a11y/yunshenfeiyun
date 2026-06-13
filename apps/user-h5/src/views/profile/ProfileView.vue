<script setup lang="ts">
import { showConfirmDialog, showSuccessToast } from 'vant'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const phoneDisplay = computed(() => {
  const phone = authStore.user?.phone || ''
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}****${phone.slice(7)}`
  }
  return phone || '未登录'
})

function goToOrders() {
  router.push('/orders')
}

function callService() {
  window.location.href = 'tel:400-xxx-xxxx'
}

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定要退出登录吗？',
    })
    await authStore.logout()
    showSuccessToast('已退出')
    router.push('/login')
  }
  catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="profile-page page-with-tabbar">
    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="avatar">
        <van-icon name="user" size="40" color="white" />
      </div>
      <div class="user-info">
        <div class="user-name">
          用户
        </div>
        <div class="user-phone">
          {{ phoneDisplay }}
        </div>
      </div>
    </div>

    <!-- 菜单列表 -->
    <van-cell-group class="menu-group">
      <van-cell title="我的订单" is-link icon="orders-o" @click="goToOrders" />
      <van-cell title="发布需求" is-link icon="edit" @click="router.push('/order/create')" />
    </van-cell-group>

    <van-cell-group class="menu-group">
      <van-cell title="帮助中心" is-link icon="question-o" />
      <van-cell title="联系客服" is-link icon="service-o" @click="callService" />
      <van-cell title="关于我们" is-link icon="info-o" />
    </van-cell-group>

    <!-- 退出登录 -->
    <div class="logout-area">
      <van-button type="danger" block round plain @click="handleLogout">
        退出登录
      </van-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
}

.user-card {
  display: flex;
  align-items: center;
  padding: $spacing-3xl $spacing-xl;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: white;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: $spacing-lg;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  margin-bottom: $spacing-xs;
}

.user-phone {
  font-size: $font-size-md;
  opacity: 0.8;
}

.menu-group {
  margin: $spacing-md;
  border-radius: $radius-xl;
  overflow: hidden;
}

.logout-area {
  padding: $spacing-2xl $spacing-xl;
}
</style>
