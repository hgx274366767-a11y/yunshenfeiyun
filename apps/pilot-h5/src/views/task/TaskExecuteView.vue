<script setup lang="ts">
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePilotStore } from '@/stores/pilot'

const router = useRouter()
const pilotStore = usePilotStore()

const currentStep = ref(0)

const order = computed(() => pilotStore.currentTask)

const currentTarget = computed(() => {
  return currentStep.value <= 1 ? 'pickup' : 'delivery'
})

const currentActionTitle = computed(() => {
  const titles = [
    '前往取货点',
    '到达取货点',
    '装货完成，准备起飞',
    '飞行中，注意安全',
    '任务完成',
  ]
  return titles[currentStep.value] || ''
})

const currentActionDesc = computed(() => {
  const descs = [
    '请前往取货点，确认货物完好后拍照留证',
    '请将货物稳妥放置在无人机吊挂装置上',
    '起飞前请检查周围环境，确保飞行安全',
    '请保持与地面通讯畅通，遵守飞行规范',
    '感谢您使用云深飞运，期待下次合作',
  ]
  return descs[currentStep.value] || ''
})

function navigateToCurrent() {
  if (!order.value)
    return

  const target = currentTarget.value
  const lat = target === 'pickup' ? order.value.pickup_lat : order.value.delivery_lat
  const lng = target === 'pickup' ? order.value.pickup_lng : order.value.delivery_lng
  const name = target === 'pickup' ? order.value.pickup_address : order.value.delivery_address

  if (!lat || !lng) {
    showFailToast('地址坐标缺失')
    return
  }

  const url = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name || '')}&mode=car&callnative=1`
  window.open(url, '_blank')
}

async function confirmArrived() {
  if (!order.value)
    return
  try {
    await showConfirmDialog({ title: '确认到达', message: '确认已到达取货点？' })
    const result = await pilotStore.updateTaskStep('arrived_pickup')
    if (result.success) {
      currentStep.value = 1
      showSuccessToast('已确认到达')
    }
    else {
      showFailToast(result.error || '操作失败')
    }
  }
  catch {
    // 用户取消
  }
}

async function uploadPickupPhoto() {
  if (!order.value)
    return

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true

  input.onchange = async () => {
    if (!input.files || input.files.length === 0)
      return

    try {
      const result = await pilotStore.updateTaskStep('executing')
      if (result.success) {
        currentStep.value = 2
        showSuccessToast('照片已上传')
      }
      else {
        showFailToast(result.error || '上传失败')
      }
    }
    catch {
      showFailToast('上传失败')
    }
  }

  input.click()
}

async function startFlight() {
  if (!order.value)
    return
  try {
    await showConfirmDialog({ title: '开始飞行', message: '确认开始飞行任务？请确保周围环境安全。' })
    const result = await pilotStore.updateTaskStep('executing')
    if (result.success) {
      currentStep.value = 3
      showSuccessToast('飞行已开始，注意安全')
    }
    else {
      showFailToast(result.error || '操作失败')
    }
  }
  catch {
    // 用户取消
  }
}

async function confirmDelivered() {
  if (!order.value)
    return

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true

  input.onchange = async () => {
    if (!input.files || input.files.length === 0)
      return

    try {
      const result = await pilotStore.updateTaskStep('completed')
      if (result.success) {
        currentStep.value = 4
        showSuccessToast('任务完成')
        setTimeout(() => {
          router.push('/hall')
        }, 1500)
      }
      else {
        showFailToast(result.error || '操作失败')
      }
    }
    catch {
      showFailToast('操作失败')
    }
  }

  input.click()
}

function callService() {
  window.location.href = 'tel:400-xxx-xxxx'
}

function goBack() {
  router.back()
}

onMounted(async () => {
  if (!pilotStore.currentTask) {
    await pilotStore.fetchCurrentTask()
  }

  if (pilotStore.currentTask) {
    const stepMap: Record<string, number> = {
      assigned: 0,
      heading_pickup: 0,
      arrived_pickup: 1,
      executing: 2,
      completed: 4,
    }
    currentStep.value = stepMap[pilotStore.currentTask.current_step] ?? 0
  }
})
</script>

<template>
  <div class="execute-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <van-icon name="arrow-left" class="back-icon" @click="goBack" />
      <span class="navbar-title">任务执行</span>
    </div>

    <div v-if="order" class="content">
      <!-- 任务步骤条 -->
      <div class="status-indicator">
        <van-steps :active="currentStep" active-color="#10B981">
          <van-step>已接单</van-step>
          <van-step>到达取货点</van-step>
          <van-step>货物已装</van-step>
          <van-step>飞行中</van-step>
          <van-step>已送达</van-step>
        </van-steps>
      </div>

      <!-- 当前操作卡片 -->
      <div class="action-card animate-in delay-1">
        <div class="action-title">
          {{ currentActionTitle }}
        </div>
        <div class="action-desc">
          {{ currentActionDesc }}
        </div>

        <div class="navigation-area">
          <button class="btn-primary" @click="navigateToCurrent">
            <van-icon name="location-o" />
            导航前往{{ currentTarget === 'pickup' ? '取货点' : '送达点' }}
          </button>
        </div>

        <div class="operation-area">
          <button
            v-if="currentStep === 0"
            class="btn-primary"
            @click="confirmArrived"
          >
            确认到达取货点
          </button>

          <button
            v-if="currentStep === 1"
            class="btn-primary"
            @click="uploadPickupPhoto"
          >
            上传装货照片
          </button>

          <button
            v-if="currentStep === 2"
            class="btn-primary"
            @click="startFlight"
          >
            开始飞行
          </button>

          <button
            v-if="currentStep === 3"
            class="btn-primary"
            style="background: linear-gradient(135deg, #10B981, #059669);"
            @click="confirmDelivered"
          >
            确认送达
          </button>

          <button
            v-if="currentStep === 4"
            class="btn-secondary"
            disabled
          >
            任务已完成
          </button>
        </div>
      </div>

      <!-- 订单详情 -->
      <div class="order-info animate-in delay-2">
        <div class="section-title">订单信息</div>
        <div class="info-card">
          <div class="info-row">
            <div class="info-icon start">
              <van-icon name="location-o" />
            </div>
            <div class="info-content">
              <div class="info-label">取货点</div>
              <div class="info-value">{{ order.pickup_address || '待确认' }}</div>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon end">
              <van-icon name="location-o" />
            </div>
            <div class="info-content">
              <div class="info-label">送达点</div>
              <div class="info-value">{{ order.delivery_address || '待确认' }}</div>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon blue">
              <van-icon name="box-o" />
            </div>
            <div class="info-content">
              <div class="info-label">物品信息</div>
              <div class="info-value">{{ order.goods_type }} · {{ order.goods_weight }}kg</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 紧急联系 -->
      <div class="emergency-contact animate-in delay-3">
        <button class="btn-secondary" @click="callService">
          <van-icon name="phone-o" />
          联系客服 400-xxx-xxxx
        </button>
      </div>
    </div>

    <div v-else class="loading">
      <van-loading size="24" color="#1D4ED8">
        加载中...
      </van-loading>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.execute-page {
  min-height: 100vh;
  background: $color-bg-page;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: white;
  border-bottom: 1px solid $color-border;
}

.back-icon {
  font-size: 20px;
  color: $color-text-primary;
  margin-right: 12px;
  cursor: pointer;
}

.navbar-title {
  font-size: 18px;
  font-weight: 700;
}

.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.status-indicator {
  background: white;
  padding: 20px 16px;
  margin-bottom: 16px;
}

.action-card {
  background: white;
  margin: 0 16px 16px;
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.action-title {
  font-size: 24px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 12px;
  color: $color-text-primary;
}

.action-desc {
  font-size: 14px;
  color: $color-text-secondary;
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.6;
}

.navigation-area {
  margin-bottom: 16px;
}

.order-info {
  padding: 0 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 12px;
}

.info-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0,0,0,0.03);

  &:last-child {
    border-bottom: none;
  }
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;

  &.start {
    background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
    color: #059669;
  }

  &.end {
    background: linear-gradient(135deg, #FEF2F2, #FECACA);
    color: #DC2626;
  }

  &.blue {
    background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
    color: #1D4ED8;
  }
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: $color-text-secondary;
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-primary;
}

.emergency-contact {
  padding: 16px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  color: $color-text-placeholder;
}
</style>
