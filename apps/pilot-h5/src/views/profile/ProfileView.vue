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

function goToIncome() {
  // TODO: 收入明细页面
}

function goToFlightRecords() {
  // TODO: 飞行记录页面
}

function goToInsurance() {
  // TODO: 保险管理页面
}

function goToCertification() {
  // TODO: 资质认证页面
}

function goToSettings() {
  // TODO: 账户设置页面
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
    <!-- 状态栏 -->
    <div class="status-bar" style="background: linear-gradient(135deg, #1D4ED8, #1E40AF);">
      <span>9:41</span>
      <div class="status-icons">
        <van-icon name="signal" size="12" />
        <van-icon name="wifi" size="12" />
        <van-icon name="volume" size="12" />
      </div>
    </div>

    <!-- 用户信息卡片 -->
    <div class="profile-header">
      <div class="profile-user">
        <div class="profile-avatar">
          <van-icon name="manager" size="36" color="white" />
        </div>
        <div class="profile-info">
          <div class="profile-name">
            {{ pilotStore.pilot?.name || '飞手' }}
          </div>
          <div class="profile-phone">
            {{ pilotStore.pilot?.phone || authStore.user?.phone || '' }}
          </div>
          <div class="profile-badge">
            <van-icon name="certificate" size="12" />
            {{ creditLabel }}
          </div>
        </div>
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="profile-stats-card animate-in delay-1">
      <div class="profile-stat">
        <div class="profile-stat-value">{{ pilotStore.pilot?.total_orders || 0 }}</div>
        <div class="profile-stat-label">总订单</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">98%</div>
        <div class="profile-stat-label">好评率</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">4.9</div>
        <div class="profile-stat-label">信用分</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">¥{{ pilotStore.pilot?.total_earnings || 0 }}</div>
        <div class="profile-stat-label">总收入</div>
      </div>
    </div>

    <!-- 在线状态 -->
    <div class="status-section animate-in delay-2">
      <div class="status-row">
        <div class="status-info">
          <div class="status-icon" :class="{ active: onlineChecked }">
            <van-icon :name="onlineChecked ? 'wifi' : 'warning-o'" />
          </div>
          <div>
            <div class="status-title">在线接单</div>
            <div class="status-desc">{{ onlineChecked ? '当前在线，可接收新任务' : '当前离线，无法接收任务' }}</div>
          </div>
        </div>
        <van-switch v-model="onlineChecked" size="24" @change="handleToggleOnline" />
      </div>
    </div>

    <!-- 工作管理 -->
    <div class="profile-section animate-in delay-2">
      <div class="profile-section-header">工作管理</div>
      <div class="profile-menu-item" @click="goToOrders">
        <div class="profile-menu-icon blue">
          <van-icon name="orders-o" />
        </div>
        <span class="profile-menu-text">我的订单</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
      <div class="profile-menu-item" @click="goToIncome">
        <div class="profile-menu-icon green">
          <van-icon name="gold-coin-o" />
        </div>
        <span class="profile-menu-text">收入明细</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
      <div class="profile-menu-item" @click="goToFlightRecords">
        <div class="profile-menu-icon orange">
          <van-icon name="aim" />
        </div>
        <span class="profile-menu-text">飞行记录</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
      <div class="profile-menu-item" @click="goToInsurance">
        <div class="profile-menu-icon purple">
          <van-icon name="shield-o" />
        </div>
        <span class="profile-menu-text">保险管理</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
    </div>

    <!-- 账户设置 -->
    <div class="profile-section animate-in delay-3">
      <div class="profile-section-header">账户设置</div>
      <div class="profile-menu-item" @click="goToCertification">
        <div class="profile-menu-icon blue">
          <van-icon name="card-o" />
        </div>
        <span class="profile-menu-text">资质认证</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
      <div class="profile-menu-item" @click="goToSettings">
        <div class="profile-menu-icon green">
          <van-icon name="setting-o" />
        </div>
        <span class="profile-menu-text">账户设置</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
      <div class="profile-menu-item" @click="callService">
        <div class="profile-menu-icon orange">
          <van-icon name="service-o" />
        </div>
        <span class="profile-menu-text">联系客服</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
      <div class="profile-menu-item" @click="handleLogout">
        <div class="profile-menu-icon red">
          <van-icon name="cross" />
        </div>
        <span class="profile-menu-text">退出登录</span>
        <van-icon name="chevron-right" class="profile-menu-arrow" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: calc(env(safe-area-inset-bottom) + 88px);
}

.status-bar {
  height: 48px;
  padding: 14px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.status-icons {
  display: flex;
  gap: 6px;
  font-size: 13px;
}

.profile-header {
  background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
  padding: 28px 24px 48px;
  color: white;
  position: relative;
  overflow: hidden;
}

.profile-header::before {
  content: '';
  position: absolute;
  bottom: -60%;
  right: -40%;
  width: 300px;
  height: 300px;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
}

.profile-user {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 10;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid rgba(255,255,255,0.3);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.profile-phone {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.profile-stats-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: -28px 20px 20px;
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  position: relative;
  z-index: 20;
}

.profile-stat {
  text-align: center;
}

.profile-stat-value {
  font-size: 18px;
  font-weight: 800;
  color: #1D4ED8;
  margin-bottom: 4px;
}

.profile-stat-label {
  font-size: 11px;
  color: #64748B;
}

.status-section {
  background: white;
  margin: 0 16px 16px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: #F1F5F9;
  color: #94A3B8;

  &.active {
    background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
    color: #10B981;
  }
}

.status-title {
  font-size: 15px;
  font-weight: 600;
  color: #0F172A;
  margin-bottom: 2px;
}

.status-desc {
  font-size: 12px;
  color: #94A3B8;
}

.profile-section {
  background: white;
  margin: 0 16px 16px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.profile-section-header {
  padding: 18px 20px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
}

.profile-menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  transition: background 0.2s;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #F8FAFC;
  }
}

.profile-menu-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 16px;

  &.blue {
    background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
    color: #1D4ED8;
  }

  &.green {
    background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
    color: #059669;
  }

  &.orange {
    background: linear-gradient(135deg, #FFF7ED, #FED7AA);
    color: #D97706;
  }

  &.purple {
    background: linear-gradient(135deg, #F5F3FF, #EDE9FE);
    color: #7C3AED;
  }

  &.red {
    background: linear-gradient(135deg, #FEF2F2, #FECACA);
    color: #DC2626;
  }
}

.profile-menu-text {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #0F172A;
}

.profile-menu-arrow {
  color: #94A3B8;
  font-size: 14px;
}
</style>
