<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function goToCreateOrder() {
  router.push('/order/create')
}

function goToOrders() {
  router.push('/orders')
}

function goToProfile() {
  router.push('/profile')
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
  <div class="home-page page-with-tabbar">
    <!-- 顶部品牌区 -->
    <div class="brand-header">
      <div class="brand-content">
        <div class="brand-logo">
          🚁
        </div>
        <div class="brand-text">
          <h1 class="brand-title">
            云深飞运
          </h1>
          <p class="brand-subtitle">
            川渝首个无人机吊运服务平台
          </p>
        </div>
      </div>
    </div>

    <!-- 快速操作区 -->
    <div class="quick-actions">
      <div class="action-card primary" @click="goToCreateOrder">
        <div class="action-icon">
          📦
        </div>
        <div class="action-info">
          <h3 class="action-title">
            发布吊运需求
          </h3>
          <p class="action-desc">
            填写货物信息，一键下单
          </p>
        </div>
        <div class="action-arrow">
          ›
        </div>
      </div>

      <div class="action-card" @click="goToOrders">
        <div class="action-icon">
          📋
        </div>
        <div class="action-info">
          <h3 class="action-title">
            我的订单
          </h3>
          <p class="action-desc">
            查看订单状态和进度
          </p>
        </div>
        <div class="action-arrow">
          ›
        </div>
      </div>
    </div>

    <!-- 服务介绍 -->
    <div class="section">
      <div class="section-title">
        为什么选择云深飞运
      </div>
      <div class="feature-grid">
        <div class="feature-item">
          <div class="feature-icon">
            ⛰️
          </div>
          <div class="feature-name">
            山地专精
          </div>
          <div class="feature-desc">
            专为川渝复杂地形设计
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            ⚡
          </div>
          <div class="feature-name">
            极速响应
          </div>
          <div class="feature-desc">
            2小时内可达
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            💰
          </div>
          <div class="feature-name">
            透明定价
          </div>
          <div class="feature-desc">
            动态定价，公平合理
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            🛡️
          </div>
          <div class="feature-name">
            安全保障
          </div>
          <div class="feature-desc">
            全程保险，放心托运
          </div>
        </div>
      </div>
    </div>

    <!-- 用户信息 -->
    <div class="user-section">
      <div class="user-info" @click="goToProfile">
        <div class="user-avatar">
          <van-icon name="user-o" size="20" color="#4361EE" />
        </div>
        <div class="user-detail">
          <span class="user-phone">{{ getPhoneDisplay() }}</span>
          <span class="user-label">查看个人信息 ›</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: $color-bg-page;
}

.brand-header {
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  padding: $spacing-3xl $spacing-xl $spacing-2xl;
  color: white;
}

.brand-content {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
}

.brand-logo {
  font-size: 48px;
}

.brand-title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  margin-bottom: $spacing-xs;
}

.brand-subtitle {
  font-size: $font-size-md;
  opacity: 0.85;
}

.quick-actions {
  padding: $spacing-xl $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.action-card {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  padding: $spacing-xl;
  background: white;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-md;
  }

  &.primary {
    background: linear-gradient(135deg, $color-primary-bg 0%, white 100%);
    border: 1px solid rgba($color-primary, 0.1);
  }
}

.action-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.action-info {
  flex: 1;
}

.action-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.action-desc {
  font-size: $font-size-md;
  color: $color-text-secondary;
}

.action-arrow {
  font-size: 24px;
  color: $color-text-placeholder;
}

.section {
  padding: $spacing-lg;
}

.section-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-lg;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
}

.feature-item {
  background: white;
  border-radius: $radius-xl;
  padding: $spacing-xl;
  text-align: center;
  box-shadow: $shadow-sm;
}

.feature-icon {
  font-size: 32px;
  margin-bottom: $spacing-sm;
}

.feature-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.feature-desc {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.user-section {
  padding: $spacing-lg;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  padding: $spacing-xl;
  background: white;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
  cursor: pointer;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: $color-primary-bg;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-phone {
  font-size: $font-size-lg;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.user-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-top: $spacing-xs;
}
</style>
