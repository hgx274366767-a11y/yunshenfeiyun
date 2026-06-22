<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const serviceType = computed(() => route.params.type as string)

const servicesData: Record<string, any> = {
  building: {
    name: '建材吊运',
    subtitle: '山区建材运输专家',
    icon: 'shop-o',
    iconBg: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
    description: '专为川渝山区建筑工地设计，解决建材上山难的痛点。无论是钢筋、水泥、砖块还是沙石，都能精准投送到指定位置。',
    advantages: [
      { title: '载重能力强', desc: '单次最大吊运500kg，满足大部分工地需求' },
      { title: '精准投送', desc: 'GPS定位+视觉引导，误差小于30cm' },
      { title: '适应复杂地形', desc: '无需修路，直接飞越悬崖、河流、密林' },
      { title: '成本更低', desc: '相比人工搬运节省40%以上成本' },
    ],
    process: [
      { step: '1', title: '需求提交', desc: '填写货物类型、重量、起降点' },
      { step: '2', title: '方案确认', desc: '15分钟内响应，确认飞行方案' },
      { step: '3', title: '吊运执行', desc: '专业飞手操作，全程监控' },
      { step: '4', title: '签收确认', desc: '货物送达，拍照确认签收' },
    ],
    price: '起步价 ¥299/趟',
    note: '具体价格根据距离、重量、地形综合计算',
  },
  agriculture: {
    name: '农产品运输',
    subtitle: '让山货走出大山',
    icon: 'gem-o',
    iconBg: 'linear-gradient(135deg, #059669, #10B981)',
    description: '帮助山区农户将水果、茶叶、中药材等农产品快速运出大山，减少搬运损耗，提高农户收入。',
    advantages: [
      { title: '保鲜运输', desc: '封闭式吊篮，减少颠簸和日晒' },
      { title: '批量运输', desc: '单次可运200-500kg，适合集中采摘' },
      { title: '减少损耗', desc: '避免山路颠簸造成的水果碰伤' },
      { title: '助农惠农', desc: '推出农户专属优惠套餐' },
    ],
    process: [
      { step: '1', title: '预约运输', desc: '提前1天预约，安排运力' },
      { step: '2', title: '上门装货', desc: '飞手到达果园/茶园装货' },
      { step: '3', title: '安全运输', desc: '平稳飞行，保护农产品品质' },
      { step: '4', title: '送达签收', desc: '运至收购点或指定位置' },
    ],
    price: '起步价 ¥199/趟',
    note: '农户凭身份证可享受8折优惠',
  },
  equipment: {
    name: '设备吊装',
    subtitle: '大型设备精准就位',
    icon: 'setting-o',
    iconBg: 'linear-gradient(135deg, #374151, #6B7280)',
    description: '为山区基站建设、光伏安装、农田灌溉等场景提供大型设备吊装服务，精准定位，安全可靠。',
    advantages: [
      { title: '大型设备', desc: '可吊运发电机、水泵、光伏板等' },
      { title: '精准定位', desc: '厘米级定位，设备一次就位' },
      { title: '专业团队', desc: '持证飞手+安全员，规范操作' },
      { title: '全程保险', desc: '设备运输全程投保，安心无忧' },
    ],
    process: [
      { step: '1', title: '现场勘察', desc: '技术人员实地评估可行性' },
      { step: '2', title: '方案设计', desc: '制定吊装方案和安全预案' },
      { step: '3', title: '吊装作业', desc: '专业团队现场执行' },
      { step: '4', title: '验收交付', desc: '客户验收，确认就位' },
    ],
    price: '起步价 ¥599/次',
    note: '含技术人员现场勘察费用',
  },
  emergency: {
    name: '应急救援',
    subtitle: '生命通道，分秒必争',
    icon: 'warning-o',
    iconBg: 'linear-gradient(135deg, #DC2626, #EF4444)',
    description: '为山区突发事件提供紧急物资投送服务，包括医疗用品、食品、饮用水等，2小时内响应，打通生命通道。',
    advantages: [
      { title: '极速响应', desc: '接到需求后2小时内起飞' },
      { title: '全天候待命', desc: '7×24小时服务，不分昼夜' },
      { title: '多种物资', desc: '药品、食品、通讯设备均可投送' },
      { title: '政府合作', desc: '与应急管理部门联动机制' },
    ],
    process: [
      { step: '1', title: '紧急呼叫', desc: '拨打应急热线或在线下单' },
      { step: '2', title: '快速响应', desc: '调度最近的飞手和设备' },
      { step: '3', title: '物资投送', desc: '开辟空中通道，精准投送' },
      { step: '4', title: '确认送达', desc: '实时反馈投送状态' },
    ],
    price: '政府联动免费 / 商业 ¥399起',
    note: '与政府联动的应急救援免费',
  },
  engineering: {
    name: '工程物资',
    subtitle: '基础设施建设好帮手',
    icon: 'label-o',
    iconBg: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
    description: '为山区电力、通讯、光伏等基础设施建设提供物资吊运服务，解决工程物资运输最后一公里难题。',
    advantages: [
      { title: '高空作业', desc: '电线杆、基站天线吊装就位' },
      { title: '偏远覆盖', desc: '人迹罕至的山区也能到达' },
      { title: '批量配送', desc: '光伏板、线缆等批量运输' },
      { title: '长期合作', desc: '工程客户签订年度协议更优惠' },
    ],
    process: [
      { step: '1', title: '项目对接', desc: '了解工程需求和进度计划' },
      { step: '2', title: '方案制定', desc: '根据工期安排运力计划' },
      { step: '3', title: '按期执行', desc: '按工程进度准时配送' },
      { step: '4', title: '项目结算', desc: '月度对账，灵活结算' },
    ],
    price: '项目定制报价',
    note: '签订年度协议享9折优惠',
  },
}

const serviceData = computed(() => servicesData[serviceType.value] || servicesData.building)

function goBack() {
  router.back()
}

function goToOrder() {
  router.push('/order/create')
}
</script>

<template>
  <div class="detail-page">
    <!-- 顶部导航 -->
    <div class="detail-nav">
      <div class="detail-nav-back" @click="goBack">
        <van-icon name="arrow-left" size="20" />
      </div>
      <div class="detail-nav-title">{{ serviceData.name }}</div>
      <div class="detail-nav-placeholder" />
    </div>

    <!-- 服务头部 -->
    <div class="detail-hero">
      <div class="detail-hero-icon" :style="{ background: serviceData.iconBg }">
        <van-icon :name="serviceData.icon" size="40" color="white" />
      </div>
      <div class="detail-hero-name">{{ serviceData.name }}</div>
      <div class="detail-hero-subtitle">{{ serviceData.subtitle }}</div>
    </div>

    <!-- 服务介绍 -->
    <div class="detail-section">
      <div class="detail-section-title">
        <span class="detail-section-title-bar"></span>
        服务介绍
      </div>
      <div class="detail-section-content">{{ serviceData.description }}</div>
    </div>

    <!-- 服务优势 -->
    <div class="detail-section">
      <div class="detail-section-title">
        <span class="detail-section-title-bar"></span>
        服务优势
      </div>
      <div class="adv-item" v-for="(adv, index) in serviceData.advantages" :key="index">
        <div class="adv-check">✓</div>
        <div>
          <div class="adv-title">{{ adv.title }}</div>
          <div class="adv-desc">{{ adv.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 服务流程 -->
    <div class="detail-section">
      <div class="detail-section-title">
        <span class="detail-section-title-bar"></span>
        服务流程
      </div>
      <div class="step-item" v-for="(step, index) in serviceData.process" :key="index">
        <div class="step-num">{{ step.step }}</div>
        <div>
          <div class="step-title">{{ step.title }}</div>
          <div class="step-desc">{{ step.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 价格说明 -->
    <div class="detail-section">
      <div class="detail-section-title">
        <span class="detail-section-title-bar"></span>
        价格说明
      </div>
      <div class="price-box">
        <div class="price-main">{{ serviceData.price }}</div>
        <div class="price-note">{{ serviceData.note }}</div>
      </div>
    </div>

    <!-- 底部占位 -->
    <div style="height: 100px;"></div>

    <!-- 底部操作栏 -->
    <div class="detail-bottom-bar">
      <div class="detail-btn-secondary" @click="goBack">返回</div>
      <div class="detail-btn-primary" @click="goToOrder">
        <van-icon name="guide-o" />
        立即下单
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 80px;
}

// 顶部导航
.detail-nav {
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

.detail-nav-back {
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

.detail-nav-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.detail-nav-placeholder {
  width: 36px;
}

// 服务头部
.detail-hero {
  background: linear-gradient(150deg, #0B1D3A 0%, $color-primary 60%, $color-primary-light 100%);
  padding: $spacing-2xl $spacing-xl $spacing-3xl;
  color: white;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -20%;
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.detail-hero-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.detail-hero-name {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
}

.detail-hero-subtitle {
  font-size: 13px;
  opacity: 0.7;
}

// 详情区块
.detail-section {
  background: white;
  margin: 12px 16px;
  border-radius: $radius-lg;
  padding: 20px;
  box-shadow: $shadow-sm;
}

.detail-section-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid $color-primary-50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-section-title-bar {
  width: 4px;
  height: 16px;
  background: $color-primary;
  border-radius: 2px;
}

.detail-section-content {
  font-size: 14px;
  color: $color-text-secondary;
  line-height: 1.8;
}

// 优势项
.adv-item {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.adv-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-light 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
  margin-top: 2px;
}

.adv-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 2px;
}

.adv-desc {
  font-size: 13px;
  color: $color-text-placeholder;
  line-height: 1.5;
}

// 步骤项
.step-item {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $color-primary-50;
  color: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 2px;
}

.step-desc {
  font-size: 13px;
  color: $color-text-placeholder;
  line-height: 1.5;
}

// 价格盒子
.price-box {
  background: linear-gradient(135deg, $color-primary-50 0%, white 100%);
  border-radius: $radius-md;
  padding: 16px;
}

.price-main {
  font-size: 24px;
  font-weight: 700;
  color: $color-primary;
  margin-bottom: 4px;
}

.price-note {
  font-size: 13px;
  color: $color-text-placeholder;
}

// 底部操作栏
.detail-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 390px;
  display: flex;
  gap: 10px;
  padding: 12px 16px 24px;
  background: white;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.detail-btn-secondary {
  flex: 1;
  padding: 14px;
  text-align: center;
  background: $color-bg-page;
  border-radius: $radius-md;
  font-size: 15px;
  font-weight: 500;
  color: $color-text-primary;
  cursor: pointer;
}

.detail-btn-primary {
  flex: 2;
  padding: 14px;
  text-align: center;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-md;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  box-shadow: $shadow-btn;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
