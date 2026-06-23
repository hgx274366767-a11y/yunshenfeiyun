<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToCreateOrder() {
  router.push('/order/create')
}

function goToOrders() {
  router.push('/orders')
}

function goToServices() {
  router.push('/services')
}

</script>

<template>
  <div class="home-page page-with-tabbar">
    <!-- Hero 区域 -->
    <div class="hero-gradient">
      <div class="hero-top">
        <span>9:41</span>
        <div class="hero-status">
          <van-icon name="signal" size="12" />
          <van-icon name="wifi" size="12" />
          <van-icon name="volume" size="12" />
        </div>
      </div>

      <!-- 品牌行 -->
      <div class="brand-row">
        <div class="brand-left">
          <div class="logo-box">
            <img src="@/assets/logo2.png" alt="云深飞运Logo" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" />
          </div>
          <div>
            <div class="brand-name">云深飞运</div>
            <div class="brand-slogan">低空领域的货拉拉</div>
          </div>
        </div>
        <div class="location-badge">
          <van-icon name="location-o" color="#F59E0B" />
          <span>重庆</span>
        </div>
      </div>

      <!-- Hero 图片卡片 -->
      <div class="hero-card">
        <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80" alt="川渝山地"/>
        <div class="hero-card-overlay">
          <div class="hero-card-title">川渝山地专精<br/>无人机吊运</div>
          <div class="hero-card-desc">
            <span class="hero-card-badge">认证平台</span>
            AOPA持证飞手 · 三者险≥100万
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions animate-in delay-1">
      <div class="section-label">快捷操作</div>
      <div class="action-grid">
        <div class="action-item" @click="goToCreateOrder">
          <div class="icon-box blue">
            <van-icon name="guide-o" />
          </div>
          <span class="action-label">发布需求</span>
        </div>
        <div class="action-item" @click="goToServices">
          <div class="icon-box green">
            <van-icon name="apps-o" />
          </div>
          <span class="action-label">服务项目</span>
        </div>
        <div class="action-item" @click="goToOrders">
          <div class="icon-box orange">
            <van-icon name="records" />
          </div>
          <span class="action-label">我的订单</span>
        </div>
        <div class="action-item">
          <div class="icon-box purple">
            <van-icon name="service-o" />
          </div>
          <span class="action-label">联系客服</span>
        </div>
      </div>
    </div>

    <!-- 品牌 Banner -->
    <div class="brand-banner animate-in delay-2">
      <div class="banner-top">
        <span class="banner-brand">云深飞运</span>
        <span class="banner-badge">认证平台</span>
      </div>
      <div class="banner-title">川渝首个无人机吊运服务平台</div>
      <div class="banner-desc">专业 · 安全 · 高效 · 透明定价</div>
    </div>

    <!-- 热门服务 -->
    <div class="section-header">
      <h2 class="section-title">热门服务</h2>
      <span class="section-more" @click="goToServices">查看全部 <van-icon name="arrow" size="10" /></span>
    </div>

    <div class="scroll-x" style="padding: 0 16px 16px;">
      <div class="service-card-small" @click="goToServices">
        <div class="service-card-img" style="background: linear-gradient(135deg, #1E40AF, #3B82F6);">
          <van-icon name="shop-o" size="36" color="white" />
        </div>
        <div class="service-card-info">
          <div class="service-card-name">建材吊运</div>
          <div class="service-card-price">¥299起/次</div>
        </div>
      </div>
      <div class="service-card-small">
        <div class="service-card-img" style="background: linear-gradient(135deg, #059669, #10B981);">
          <van-icon name="gem-o" size="36" color="white" />
        </div>
        <div class="service-card-info">
          <div class="service-card-name">农产品运输</div>
          <div class="service-card-price">¥199起/次</div>
        </div>
      </div>
      <div class="service-card-small">
        <div class="service-card-img" style="background: linear-gradient(135deg, #374151, #6B7280);">
          <van-icon name="setting-o" size="36" color="white" />
        </div>
        <div class="service-card-info">
          <div class="service-card-name">设备吊装</div>
          <div class="service-card-price">¥499起/次</div>
        </div>
      </div>
    </div>

    <!-- 优势展示 -->
    <div class="features-section">
      <div class="section-header" style="padding: 0; margin-bottom: 14px;">
        <h2 class="section-title">为什么选择我们</h2>
      </div>
      <div class="features-grid animate-in delay-3">
        <div class="feature-card">
          <div class="num-badge" style="background: linear-gradient(135deg, #34D399, #10B981);">01</div>
          <div class="feature-name">山地专精</div>
          <div class="feature-desc">深耕川渝，熟悉复杂山地地形作业环境</div>
        </div>
        <div class="feature-card">
          <div class="num-badge" style="background: linear-gradient(135deg, #60A5FA, #3B82F6);">02</div>
          <div class="feature-name">极速响应</div>
          <div class="feature-desc">接单30分钟响应，4小时到达现场</div>
        </div>
        <div class="feature-card">
          <div class="num-badge" style="background: linear-gradient(135deg, #FBBF24, #F59E0B);">03</div>
          <div class="feature-name">透明定价</div>
          <div class="feature-desc">公里+重量双维度计费，无隐性收费</div>
        </div>
        <div class="feature-card">
          <div class="num-badge" style="background: linear-gradient(135deg, #F87171, #EF4444);">04</div>
          <div class="feature-name">安全保障</div>
          <div class="feature-desc">AOPA持证飞手，三者险≥100万</div>
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

// Hero 区域
.hero-gradient {
  background: linear-gradient(150deg, #0B1D3A 0%, $color-primary 60%, $color-primary-light 100%);
  padding: 16px 16px 40px;
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

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  opacity: 0.8;
  font-size: 12px;
}

.hero-status {
  display: flex;
  gap: 6px;
  align-items: center;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.brand-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.brand-slogan {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
}

.location-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

// Hero 图片卡片
.hero-card {
  border-radius: $radius-xl;
  overflow: hidden;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 180px;
    object-fit: cover;
    display: block;
  }
}

.hero-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.hero-card-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.hero-card-desc {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-card-badge {
  background: $color-warning;
  color: #000;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

// 快捷操作
.quick-actions {
  margin: -28px 16px 16px;
  background: white;
  border-radius: $radius-xl;
  padding: 20px;
  box-shadow: $shadow-lg;
  position: relative;
  z-index: 10;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 0;

  &:active {
    transform: scale(0.95);
  }
}

.action-label {
  font-size: 12px;
  font-weight: 500;
  color: $color-text-secondary;
}

// 品牌 Banner
.brand-banner {
  margin: 0 16px 16px;
  background: linear-gradient(135deg, $color-primary-50 0%, #EEF2FF 100%);
  border: 1px solid $color-primary-100;
  border-radius: $radius-lg;
  padding: 16px;
}

.banner-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.banner-brand {
  font-size: 16px;
  font-weight: 700;
  color: $color-primary;
}

.banner-badge {
  background: $color-primary;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}

.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-primary-dark;
}

.banner-desc {
  font-size: 12px;
  color: $color-primary-light;
  margin-top: 2px;
}

// 服务卡片
.service-card-small {
  flex-shrink: 0;
  width: 160px;
  background: white;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }
}

.service-card-img {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-card-info {
  padding: 12px;
}

.service-card-name {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 4px;
}

.service-card-price {
  font-size: 13px;
  font-weight: 700;
  color: $color-primary;
}

// 优势展示
.features-section {
  padding: 0 16px 16px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.feature-card {
  background: white;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: $shadow-sm;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: $color-text-placeholder;
  line-height: 1.5;
}
</style>
