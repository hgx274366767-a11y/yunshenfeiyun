<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const services = [
  {
    id: 'building',
    name: '建材吊运',
    icon: 'shop-o',
    desc: '钢筋、水泥、砖块等建材上山',
    price: '¥299起/次',
    iconBg: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
    tags: ['山地专精', '承重50kg+'],
  },
  {
    id: 'agriculture',
    name: '农产品运输',
    icon: 'gem-o',
    desc: '水果、茶叶、中药材出山',
    price: '¥199起/次',
    iconBg: 'linear-gradient(135deg, #059669, #10B981)',
    tags: ['保鲜运输', '助农增收'],
  },
  {
    id: 'equipment',
    name: '设备吊装',
    icon: 'setting-o',
    desc: '发电机、水泵、农机设备吊运',
    price: '¥499起/次',
    iconBg: 'linear-gradient(135deg, #374151, #6B7280)',
    tags: ['精准吊装', '专业认证'],
  },
  {
    id: 'emergency',
    name: '应急救援',
    icon: 'warning-o',
    desc: '紧急物资、医疗用品快速投送',
    price: '¥399起/次',
    iconBg: 'linear-gradient(135deg, #DC2626, #EF4444)',
    tags: ['2小时响应', '全天候待命'],
  },
  {
    id: 'engineering',
    name: '工程物资',
    icon: 'label-o',
    desc: '电线杆、光伏板、基站设备',
    price: '定制报价',
    iconBg: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
    tags: ['高空作业', '偏远地区'],
  },
]

function goToDetail(type: string) {
  router.push(`/services/${type}`)
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="services-page">
    <!-- 顶部导航 -->
    <div class="services-nav">
      <div class="services-nav-back" @click="goBack">
        <van-icon name="arrow-left" size="20" />
      </div>
      <div class="services-nav-title">服务项目</div>
      <div class="services-nav-placeholder" />
    </div>

    <!-- Hero 区域 -->
    <div class="services-hero">
      <div class="services-hero-content">
        <div class="services-hero-title">专业无人机<br/>吊运服务</div>
        <div class="services-hero-desc">5大服务类型 · 覆盖川渝全域山区</div>
      </div>
    </div>

    <!-- 服务列表 -->
    <div class="services-list">
      <div
        class="services-item"
        v-for="service in services"
        :key="service.id"
        @click="goToDetail(service.id)"
      >
        <div class="services-item-icon" :style="{ background: service.iconBg }">
          <van-icon :name="service.icon" size="32" color="white" />
        </div>
        <div class="services-item-content">
          <div class="services-item-header">
            <div class="services-item-name">{{ service.name }}</div>
            <div class="services-item-price">{{ service.price }}</div>
          </div>
          <div class="services-item-desc">{{ service.desc }}</div>
          <div class="services-item-tags">
            <span
              class="services-item-tag"
              v-for="tag in service.tags"
              :key="tag"
            >{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.services-page {
  min-height: 100vh;
  background: $color-bg-page;
}

// 顶部导航
.services-nav {
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

.services-nav-back {
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

.services-nav-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.services-nav-placeholder {
  width: 36px;
}

// Hero 区域
.services-hero {
  background: linear-gradient(150deg, #0B1D3A 0%, $color-primary 60%, $color-primary-light 100%);
  padding: $spacing-2xl $spacing-xl;
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

.services-hero-content {
  position: relative;
  z-index: 10;
}

.services-hero-title {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 8px;
}

.services-hero-desc {
  font-size: 13px;
  opacity: 0.6;
}

// 服务列表
.services-list {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.services-item {
  background: white;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: $shadow-sm;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  gap: 14px;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }
}

.services-item-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.services-item-content {
  flex: 1;
  min-width: 0;
}

.services-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.services-item-name {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-primary;
}

.services-item-price {
  font-size: 14px;
  font-weight: 700;
  color: $color-primary;
}

.services-item-desc {
  font-size: 12px;
  color: $color-text-placeholder;
  line-height: 1.5;
  margin-bottom: 8px;
}

.services-item-tags {
  display: flex;
  gap: 6px;
}

.services-item-tag {
  font-size: 10px;
  font-weight: 600;
  color: $color-primary;
  background: $color-primary-50;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
