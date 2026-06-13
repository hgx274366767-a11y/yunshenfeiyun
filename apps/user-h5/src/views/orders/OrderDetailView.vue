<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { useOrdersStore } from '@/stores/orders'
import { ORDER_STATUS_MAP } from '@/types'

const route = useRoute()
const router = useRouter()
const ordersStore = useOrdersStore()

const orderId = route.params.id as string
const actionLoading = ref(false)

const order = computed(() => ordersStore.currentOrder)

const statusInfo = computed(() => {
  if (!order.value) return { label: '', class: '', bg: '' }
  const status = order.value.status as keyof typeof ORDER_STATUS_MAP
  const info = ORDER_STATUS_MAP[status] || { label: order.value.status, class: '' }
  const bgMap: Record<string, string> = {
    pending: 'linear-gradient(135deg, #FA8C16, #F90)',
    accepted: 'linear-gradient(135deg, #1890FF, #0057e7)',
    in_progress: 'linear-gradient(135deg, #52C41A, #06ad56)',
    completed: 'linear-gradient(135deg, #BFBFBF, #999)',
    cancelled: 'linear-gradient(135deg, #FF4D4F, #cf1322)',
  }
  return { ...info, bg: bgMap[status] || '#999' }
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function handleCancel() {
  try {
    await showConfirmDialog({
      title: '取消订单',
      message: '确定要取消这个订单吗？',
    })
    actionLoading.value = true
    const { error } = await ordersStore.cancelOrder(orderId)
    actionLoading.value = false
    if (error) {
      showFailToast(error || '取消失败')
    }
    else {
      showSuccessToast('已取消')
    }
  }
  catch {
    // 用户取消
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  ordersStore.fetchOrderDetail(orderId)
})
</script>

<template>
  <div class="detail-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <van-icon name="arrow-left" class="back-icon" @click="goBack" />
      <span class="navbar-title">订单详情</span>
    </div>

    <van-loading v-if="ordersStore.loading && !order" class="loading" />

    <template v-else-if="order">
      <!-- 状态卡片 -->
      <div class="status-card" :style="{ background: statusInfo.bg }">
        <span class="status-text">{{ statusInfo.label }}</span>
        <span v-if="order.price" class="price-text">¥{{ order.price }}</span>
      </div>

      <!-- 路线信息 -->
      <div class="info-section">
        <div class="info-card">
          <div class="route-visual">
            <div class="route-point">
              <div class="point-dot start" />
              <div class="point-info">
                <div class="point-label">起始地址</div>
                <div class="point-address">{{ order.pickup_address }}</div>
              </div>
            </div>
            <div class="route-connector" />
            <div class="route-point">
              <div class="point-dot end" />
              <div class="point-info">
                <div class="point-label">目的地址</div>
                <div class="point-address">{{ order.delivery_address }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 飞行参数 -->
      <div class="info-section">
        <div class="section-label">
          飞行参数
        </div>
        <div class="params-grid">
          <div class="param-item">
            <div class="param-value">
              {{ order.altitude }}m
            </div>
            <div class="param-label">
              海拔
            </div>
          </div>
          <div class="param-item">
            <div class="param-value">
              {{ order.elevation_diff }}m
            </div>
            <div class="param-label">
              落差
            </div>
          </div>
          <div class="param-item">
            <div class="param-value">
              {{ order.lifting_method }}
            </div>
            <div class="param-label">
              吊运方式
            </div>
          </div>
        </div>
      </div>

      <!-- 货物信息 -->
      <div class="info-section">
        <div class="section-label">
          货物信息
        </div>
        <div class="info-card">
          <van-cell-group :border="false">
            <van-cell title="货物类型" :value="order.goods_type" :border="false" />
            <van-cell title="重量" :value="`${order.goods_weight}kg`" :border="false" />
            <van-cell v-if="order.goods_desc" title="描述" :value="order.goods_desc" :border="false" />
          </van-cell-group>
        </div>
      </div>

      <!-- 费用明细 -->
      <div class="info-section">
        <div class="section-label">
          费用明细
        </div>
        <div class="info-card">
          <van-cell-group :border="false">
            <van-cell title="吊运费" :value="`¥${order.price}`" :border="false" />
            <van-cell title="平台佣金" value="¥0（MVP免佣）" :border="false" />
            <van-cell title="保险" value="已包含" :border="false" />
          </van-cell-group>
        </div>
      </div>

      <!-- 订单信息 -->
      <div class="info-section">
        <div class="section-label">
          订单信息
        </div>
        <div class="info-card">
          <van-cell-group :border="false">
            <van-cell title="订单编号" :value="`#${order.id.slice(-8)}`" :border="false" />
            <van-cell title="创建时间" :value="formatDate(order.created_at)" :border="false" />
            <van-cell title="更新时间" :value="formatDate(order.updated_at)" :border="false" />
            <van-cell v-if="order.remark" title="备注" :value="order.remark" :border="false" />
          </van-cell-group>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="order.status === 'pending'" class="actions safe-area-bottom">
        <van-button
          type="danger"
          block
          round
          plain
          :loading="actionLoading"
          @click="handleCancel"
        >
          取消订单
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

.price-text {
  font-size: $font-size-xl;
  opacity: 0.9;
  margin-top: 8px;
  display: block;
}

.info-section {
  padding: $spacing-md $spacing-lg;
}

.section-label {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-md;
}

.info-card {
  background: white;
  border-radius: $radius-xl;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.route-visual {
  padding: $spacing-xl;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;

  &.start {
    background: $color-primary;
  }

  &.end {
    background: $color-success;
  }
}

.route-connector {
  width: 2px;
  height: 24px;
  background: $color-border;
  margin-left: 5px;
}

.point-info {
  flex: 1;
}

.point-label {
  font-size: $font-size-sm;
  color: $color-text-placeholder;
  margin-bottom: $spacing-xs;
}

.point-address {
  font-size: $font-size-lg;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;
  background: white;
  border-radius: $radius-xl;
  padding: $spacing-xl;
  box-shadow: $shadow-sm;
}

.param-item {
  text-align: center;
}

.param-value {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-primary;
  margin-bottom: $spacing-xs;
}

.param-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-lg $spacing-xl;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.empty-state {
  display: flex;
  justify-content: center;
  padding-top: 120px;
}
</style>
