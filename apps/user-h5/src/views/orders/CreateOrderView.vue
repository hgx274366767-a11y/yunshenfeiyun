<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'

const router = useRouter()
const orderStore = useOrdersStore()

const formData = ref({
  goods_type: '',
  goods_weight: 50,
  goods_desc: '',
  pickup_address: '',
  delivery_address: '',
  pickup_lat: 0,
  pickup_lng: 0,
  delivery_lat: 0,
  delivery_lng: 0,
  terrain_type: 'MOUNTAIN',
  time_required: 'STANDARD' as 'STANDARD' | 'URGENT_2H' | 'URGENT_4H' | 'SAME_DAY',
  goods_value: 0,
})

const estimatedPrice = ref(299)

function goBack() {
  router.back()
}

async function submitOrder() {
  try {
    await orderStore.createOrder({
      goods_type: formData.value.goods_type || '建材吊运',
      goods_weight: formData.value.goods_weight,
      goods_desc: formData.value.goods_desc,
      pickup_address: formData.value.pickup_address,
      delivery_address: formData.value.delivery_address,
      pickup_lat: formData.value.pickup_lat,
      pickup_lng: formData.value.pickup_lng,
      delivery_lat: formData.value.delivery_lat,
      delivery_lng: formData.value.delivery_lng,
      altitude: 0,
      elevation_diff: 0,
      lifting_method: '标准吊运',
      urgency: formData.value.time_required,
      contact_phone: '',
      remark: '',
    })
    router.push('/orders')
  } catch (error) {
    console.error('提交失败:', error)
  }
}
</script>

<template>
  <div class="order-page">
    <!-- 顶部导航 -->
    <div class="order-nav">
      <div class="order-nav-back" @click="goBack">
        <van-icon name="arrow-left" size="20" />
      </div>
      <div class="order-nav-title">发布吊运需求</div>
      <div class="order-nav-placeholder" />
    </div>

    <!-- Hero 区域 -->
    <div class="order-hero">
      <div class="order-hero-title">填写货物信息<br/>智能匹配最优飞手</div>
      <div class="order-hero-badge">
        <span class="order-hero-dot"></span>
        30分钟响应
      </div>
    </div>

    <!-- 服务类型选择 -->
    <div class="order-type-card">
      <div class="section-label">选择服务类型</div>
      <div class="order-type-grid">
        <div
          class="order-type-item"
          :class="{ active: formData.goods_type === 'building' }"
          @click="formData.goods_type = 'building'"
        >
          <van-icon name="shop-o" size="24" />
          <span>建材吊运</span>
        </div>
        <div
          class="order-type-item"
          :class="{ active: formData.goods_type === 'agriculture' }"
          @click="formData.goods_type = 'agriculture'"
        >
          <van-icon name="gem-o" size="24" />
          <span>农产品</span>
        </div>
        <div
          class="order-type-item"
          :class="{ active: formData.goods_type === 'equipment' }"
          @click="formData.goods_type = 'equipment'"
        >
          <van-icon name="setting-o" size="24" />
          <span>设备吊装</span>
        </div>
        <div
          class="order-type-item"
          :class="{ active: formData.goods_type === 'emergency' }"
          @click="formData.goods_type = 'emergency'"
        >
          <van-icon name="warning-o" size="24" />
          <span>应急救援</span>
        </div>
      </div>
    </div>

    <!-- 货物信息 -->
    <div class="order-section">
      <div class="order-section-header">
        <span class="order-section-bar"></span>
        <span class="order-section-title">货物信息</span>
      </div>
      <div class="order-section-body">
        <div class="order-field">
          <span class="order-field-label">
            <span class="order-field-required">*</span>
            货物名称
          </span>
          <input class="order-field-input" v-model="formData.goods_desc" placeholder="请输入货物名称" />
        </div>
        <div class="order-field">
          <span class="order-field-label">
            <span class="order-field-required">*</span>
            货物重量
          </span>
          <input class="order-field-input" v-model.number="formData.goods_weight" type="number" placeholder="请输入重量(kg)" />
        </div>
        <div class="order-field">
          <span class="order-field-label">货物价值</span>
          <input class="order-field-input" v-model.number="formData.goods_value" type="number" placeholder="请输入货物价值(元)" />
        </div>
      </div>
    </div>

    <!-- 起降点信息 -->
    <div class="order-section">
      <div class="order-section-header">
        <span class="order-section-bar" style="background: #10B981;"></span>
        <span class="order-section-title">起降点信息</span>
      </div>
      <div class="order-section-body">
        <div class="order-field">
          <span class="order-field-label">
            <span class="order-field-required">*</span>
            起飞地点
          </span>
          <input class="order-field-input" v-model="formData.pickup_address" placeholder="点击选择位置" />
        </div>
        <div class="order-field">
          <span class="order-field-label">
            <span class="order-field-required">*</span>
            落地地点
          </span>
          <input class="order-field-input" v-model="formData.delivery_address" placeholder="点击选择位置" />
        </div>
      </div>
    </div>

    <!-- 费用预估 -->
    <div class="order-price-card">
      <div class="order-price-header">
        <span class="order-price-label">费用预估</span>
        <span class="order-price-rule">计费规则</span>
      </div>
      <div class="order-price-main">
        <span class="order-price-amount">¥{{ estimatedPrice }}</span>
        <span class="order-price-unit">/次起</span>
      </div>
      <div class="order-price-details">
        <span>基础费 ¥299</span>
        <span>超重费 ¥0</span>
        <span>里程费 待定</span>
      </div>
    </div>

    <!-- 提交按钮 -->
    <div class="order-submit">
      <button class="order-submit-btn" @click="submitOrder">
        <van-icon name="guide-o" />
        立即发布吊运需求
      </button>
      <div class="order-submit-tip">提交即表示同意《服务协议》</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.order-page {
  min-height: 100vh;
  background: $color-bg-page;
}

// 顶部导航
.order-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg $spacing-xl;
  background: white;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: $shadow-sm;
}

.order-nav-back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $color-bg-page;
  color: $color-text-secondary;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.order-nav-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.order-nav-placeholder {
  width: 36px;
}

// Hero 区域
.order-hero {
  background: linear-gradient(150deg, #0B1D3A 0%, $color-primary 60%, $color-primary-light 100%);
  padding: $spacing-xl $spacing-xl $spacing-2xl;
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

.order-hero-title {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 12px;
}

.order-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.order-hero-dot {
  width: 6px;
  height: 6px;
  background: $color-success;
  border-radius: 50%;
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// 服务类型选择
.order-type-card {
  margin: -16px 16px 12px;
  background: white;
  border-radius: $radius-xl;
  padding: 16px;
  box-shadow: $shadow-lg;
  position: relative;
  z-index: 10;
}

.order-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.order-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
  border-radius: 12px;
  border: 1.5px solid $color-border;
  background: white;
  cursor: pointer;
  transition: all 0.2s;

  span {
    font-size: 12px;
    font-weight: 600;
    color: $color-text-secondary;
  }

  &.active {
    background: $color-primary-50;
    border-color: $color-primary;
    color: $color-primary;

    span {
      color: $color-primary;
    }
  }
}

// 订单区块
.order-section {
  background: white;
  margin: 0 16px 12px;
  border-radius: $radius-xl;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.order-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 12px;
}

.order-section-bar {
  width: 4px;
  height: 16px;
  background: $color-primary;
  border-radius: 2px;
}

.order-section-title {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-primary;
}

.order-section-body {
  padding: 0 16px 16px;
}

.order-field {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }
}

.order-field-label {
  width: 80px;
  font-size: 13px;
  color: $color-text-secondary;
  flex-shrink: 0;
}

.order-field-required {
  color: $color-danger;
  margin-right: 2px;
}

.order-field-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: $color-text-primary;
  text-align: right;

  &::placeholder {
    color: $color-text-placeholder;
  }
}

// 费用预估
.order-price-card {
  margin: 0 16px 16px;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-xl;
  padding: 20px;
  color: white;
  box-shadow: $shadow-btn;
}

.order-price-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.order-price-label {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.9;
}

.order-price-rule {
  font-size: 11px;
  opacity: 0.7;
  text-decoration: underline;
  cursor: pointer;
}

.order-price-main {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 12px;
}

.order-price-amount {
  font-size: 40px;
  font-weight: 700;
}

.order-price-unit {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 6px;
}

.order-price-details {
  display: flex;
  gap: 16px;
  font-size: 11px;
  opacity: 0.8;
}

// 提交按钮
.order-submit {
  padding: 0 16px 32px;
}

.order-submit-btn {
  width: 100%;
  padding: 16px;
  text-align: center;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-xl;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  box-shadow: $shadow-btn;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;

  &:active {
    transform: scale(0.98);
  }
}

.order-submit-tip {
  text-align: center;
  font-size: 12px;
  color: $color-text-placeholder;
  margin-top: 12px;
}

// Section 标签
.section-label {
  font-size: 11px;
  font-weight: $font-weight-semibold;
  color: $color-text-placeholder;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: $spacing-md;
}
</style>
