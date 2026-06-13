<script setup lang="ts">
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePilotStore } from '@/stores/pilot'

const router = useRouter()
const authStore = useAuthStore()
const pilotStore = usePilotStore()

const onlineChecked = ref(pilotStore.onlineStatus)

watch(
  () => pilotStore.onlineStatus,
  (val) => {
    onlineChecked.value = val
  },
)

const creditLabel = computed(() => {
  const map: Record<string, string> = {
    gold: '金牌飞手',
    senior: '资深飞手',
    probation: '见习飞手',
  }
  return map[pilotStore.creditLevel] || '见习飞手'
})

const creditTagType = computed(() => {
  const map: Record<string, string> = {
    gold: 'warning',
    senior: 'primary',
    probation: 'default',
  }
  return (map[pilotStore.creditLevel] || 'default') as 'warning' | 'primary' | 'default'
})

async function handleToggleOnline(checked: boolean) {
  const success = await pilotStore.toggleOnlineStatus()
  if (success) {
    showSuccessToast(checked ? '已上线' : '已下线')
  }
  else {
    showFailToast('状态更新失败')
    onlineChecked.value = !checked
  }
}

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

onMounted(() => {
  pilotStore.fetchPilotInfo()
})
</script>

<template>
  <div class="profile-page">
    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="avatar">
        <van-icon name="manager" size="40" color="white" />
      </div>
      <div class="user-info">
        <div class="user-name">
          {{ pilotStore.pilot?.name || '飞手' }}
        </div>
        <div class="user-phone">
          {{ pilotStore.pilot?.phone || authStore.user?.phone || '' }}
        </div>
      </div>
      <div class="credit-badge" :class="pilotStore.creditLevel">
        {{ creditLabel }}
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="stats-card">
      <div class="stat-item">
        <div class="stat-value">
          {{ pilotStore.pilot?.total_orders || 0 }}
        </div>
        <div class="stat-label">
          总订单
        </div>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <div class="stat-value">
          ¥{{ pilotStore.pilot?.total_earnings || 0 }}
        </div>
        <div class="stat-label">
          总收入
        </div>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <div class="stat-value">
          {{ pilotStore.pilot?.today_orders || 0 }}
        </div>
        <div class="stat-label">
          今日订单
        </div>
      </div>
    </div>

    <!-- 在线状态 -->
    <div class="status-section">
      <div class="status-row">
        <span class="status-label">在线状态</span>
        <van-switch v-model="onlineChecked" size="24" @change="handleToggleOnline" />
      </div>
    </div>

    <!-- 菜单列表 -->
    <van-cell-group class="menu-group">
      <van-cell title="我的订单" is-link icon="orders-o" @click="goToOrders" />
      <van-cell title="收入明细" is-link icon="gold-coin-o" />
      <van-cell title="飞行记录" is-link icon="label-o" />
      <van-cell title="信用评级" is-link icon="medal-o">
        <template #value>
          <van-tag :type="creditTagType">
            {{ creditLabel }}
          </van-tag>
        </template>
      </van-cell>
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
  padding: $spacing-2xl $spacing-xl;
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

.credit-badge {
  padding: $spacing-xs $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;

  &.gold {
    background: #FFF7E6;
    color: $color-warning;
  }

  &.senior {
    background: $color-primary-bg;
    color: $color-primary;
  }

  &.probation {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
}

.stats-card {
  display: flex;
  align-items: center;
  background: white;
  margin: $spacing-md;
  padding: $spacing-xl;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.stat-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: $color-border-light;
}

.status-section {
  background: white;
  margin: $spacing-md;
  border-radius: $radius-xl;
  overflow: hidden;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xl;
}

.status-label {
  font-size: $font-size-lg;
  color: $color-text-primary;
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
