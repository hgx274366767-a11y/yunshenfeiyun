<script setup lang="ts">
// Types imported for reference
// ORDER_TYPE_MAP, TERRAIN_MAP available if needed
import { showFailToast, showSuccessToast } from 'vant'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'
import { usePilotStore } from '@/stores/pilot'

const route = useRoute()
const router = useRouter()
const pilotStore = usePilotStore()
const ordersStore = useOrdersStore()

const orderId = route.params.id as string
const actionLoading = ref(false)

// 获取当前任务（优先使用 pilotStore）
const task = computed(() => pilotStore.currentTask)

const statusMap: Record<string, { label: string, bg: string }> = {
  assigned: { label: '待执行', bg: 'linear-gradient(135deg, #1989fa, #0057e7)' },
  heading_pickup: { label: '前往取货点', bg: 'linear-gradient(135deg, #ff976a, #f90)' },
  arrived_pickup: { label: '已到达取货点', bg: 'linear-gradient(135deg, #07c160, #06ad56)' },
  executing: { label: '吊运执行中', bg: 'linear-gradient(135deg, #07c160, #06ad56)' },
  completed: { label: '已完成', bg: 'linear-gradient(135deg, #07c160, #06ad56)' },
}

const statusLabel = computed(() => statusMap[task.value?.current_step || '']?.label || '未知')
const statusBg = computed(() => statusMap[task.value?.current_step || '']?.bg || '#999')

const order = computed(() => (ordersStore.currentOrder || task.value) as any)

async function handleAccept() {
  actionLoading.value = true
  const { error } = await ordersStore.acceptOrder(orderId)
  actionLoading.value = false
  if (!error) {
    showSuccessToast('接单成功')
    ordersStore.fetchOrderDetail(orderId)
  }
  else {
    showFailToast(error || '接单失败')
  }
}

function goExecute() {
  router.push(`/task/${orderId}/execute`)
}

function goBack() {
  router.back()
}

onMounted(async () => {
  // 同时加载订单详情和当前任务
  ordersStore.fetchOrderDetail(orderId)
  if (!pilotStore.currentTask) {
    await pilotStore.fetchCurrentTask()
  }
})
</script>

<template>
  <div class="detail-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <van-icon name="arrow-left" class="back-icon" @click="goBack" />
      <span class="navbar-title">任务详情</span>
    </div>

    <van-loading v-if="ordersStore.loading && !order" class="loading" />

    <template v-else-if="order">
      <!-- 状态卡片（当有当前任务时显示） -->
      <div v-if="task" class="status-card" :style="{ background: statusBg }">
        <span class="status-text">{{ statusLabel }}</span>
        <span class="earnings">预计收入 ¥{{ task.total_price }}</span>
      </div>

      <!-- 订单信息 -->
      <van-cell-group title="订单信息">
        <van-cell title="订单编号" :value="`#${(order.id || orderId).slice(-8)}`" />
        <van-cell title="货物类型" :value="order.goods_type" />
        <van-cell title="重量" :value="`${order.goods_weight || order.weight_kg}kg`" />
        <van-cell v-if="order.altitude" title="海拔" :value="`${order.altitude}m`" />
        <van-cell v-if="order.elevation_diff" title="落差" :value="`${order.elevation_diff}m`" />
        <van-cell v-if="order.lifting_method" title="吊运方式" :value="order.lifting_method" />
      </van-cell-group>

      <!-- 路线信息 -->
      <van-cell-group title="路线">
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
      </van-cell-group>

      <!-- 费用明细 -->
      <van-cell-group title="费用明细">
        <van-cell title="吊运费" :value="`¥${order.price || order.total_price}`" />
        <van-cell title="平台佣金" value="¥0（MVP免佣）" />
        <van-cell title="保险" value="已包含" />
      </van-cell-group>

      <!-- 操作按钮 -->
      <div class="actions safe-area-bottom">
        <van-button
          v-if="order.status === 'pending'"
          type="primary"
          block
          round
          :loading="actionLoading"
          @click="handleAccept"
        >
          接受订单
        </van-button>
        <van-button
          v-else-if="order.status === 'completed'"
          type="default"
          block
          round
          disabled
        >
          任务已完成
        </van-button>
        <van-button
          v-else
          type="primary"
          block
          round
          @click="goExecute"
        >
          开始执行
        </van-button>
      </div>
    </template>

    <div v-else class="empty-state">
      <van-empty description="订单不存在" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 80px;
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

.loading {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.status-card {
  padding: 48px 32px;
  color: white;
  text-align: center;
}

.status-text {
  font-size: 28px;
  font-weight: $font-weight-bold;
  display: block;
}

.earnings {
  font-size: $font-size-lg;
  opacity: 0.9;
  margin-top: 8px;
  display: block;
}

.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-lg $spacing-xl;
  background: $color-bg-card;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.empty-state {
  display: flex;
  justify-content: center;
  padding-top: 120px;
}
</style>
