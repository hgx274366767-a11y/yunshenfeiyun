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

  // H5 环境：打开高德地图网页版
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

  // H5 环境：使用文件选择器
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

  // H5 环境：使用文件选择器上传送达照片
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
  // 如果没有当前任务，尝试加载
  if (!pilotStore.currentTask) {
    await pilotStore.fetchCurrentTask()
  }

  // 根据当前任务步骤设置步骤条
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
        <van-steps :active="currentStep" active-color="#07c160">
          <van-step>已接单</van-step>
          <van-step>到达取货点</van-step>
          <van-step>货物已装</van-step>
          <van-step>飞行中</van-step>
          <van-step>已送达</van-step>
        </van-steps>
      </div>

      <!-- 当前操作卡片 -->
      <div class="action-card">
        <div class="action-title">
          {{ currentActionTitle }}
        </div>
        <div class="action-desc">
          {{ currentActionDesc }}
        </div>

        <div class="navigation-area">
          <van-button type="primary" block round size="large" @click="navigateToCurrent">
            <van-icon name="location-o" />
            导航前往{{ currentTarget === 'pickup' ? '取货点' : '送达点' }}
          </van-button>
        </div>

        <div class="operation-area">
          <van-button
            v-if="currentStep === 0"
            type="primary"
            block
            round
            @click="confirmArrived"
          >
            确认到达取货点
          </van-button>

          <van-button
            v-if="currentStep === 1"
            type="primary"
            block
            round
            @click="uploadPickupPhoto"
          >
            上传装货照片
          </van-button>

          <van-button
            v-if="currentStep === 2"
            type="primary"
            block
            round
            @click="startFlight"
          >
            开始飞行
          </van-button>

          <van-button
            v-if="currentStep === 3"
            type="success"
            block
            round
            @click="confirmDelivered"
          >
            确认送达
          </van-button>

          <van-button
            v-if="currentStep === 4"
            type="default"
            block
            round
            disabled
          >
            任务已完成
          </van-button>
        </div>
      </div>

      <!-- 订单详情 -->
      <van-cell-group title="订单信息">
        <van-cell title="取货点" :label="order.pickup_address">
          <template #left-icon>
            <van-icon name="location-o" style="margin-right: 8px; color: #1989fa;" />
          </template>
        </van-cell>
        <van-cell title="送达点" :label="order.delivery_address">
          <template #left-icon>
            <van-icon name="location-o" style="margin-right: 8px; color: #07c160;" />
          </template>
        </van-cell>
        <van-cell title="物品" :value="`${order.goods_type} · ${order.goods_weight}kg`" />
        <van-cell v-if="order.altitude" title="海拔" :value="`${order.altitude}m`" />
        <van-cell v-if="order.elevation_diff" title="落差" :value="`${order.elevation_diff}m`" />
        <van-cell v-if="order.lifting_method" title="吊运方式" :value="order.lifting_method" />
      </van-cell-group>

      <!-- 紧急联系 -->
      <van-cell-group title="紧急联系">
        <van-cell title="平台客服" value="400-xxx-xxxx" is-link @click="callService" />
      </van-cell-group>
    </div>

    <div v-else class="loading">
      <van-loading size="24" vertical>
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
  height: $navbar-height;
  padding: 0 $spacing-lg;
  background: white;
  border-bottom: 1px solid $color-border-light;
}

.back-icon {
  font-size: 20px;
  color: $color-text-primary;
  margin-right: $spacing-md;
  cursor: pointer;
}

.navbar-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-semibold;
}

.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.status-indicator {
  background: white;
  padding: $spacing-xl $spacing-md;
}

.action-card {
  background: white;
  margin: $spacing-md;
  padding: $spacing-2xl;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
}

.action-title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  text-align: center;
  margin-bottom: $spacing-md;
}

.action-desc {
  font-size: $font-size-lg;
  color: $color-text-secondary;
  text-align: center;
  margin-bottom: $spacing-2xl;
}

.navigation-area {
  margin-bottom: $spacing-xl;
}

.operation-area {
  margin-top: $spacing-md;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  color: $color-text-placeholder;
}
</style>
