<script setup lang="ts">
import type { GrabbableOrder } from '@/types'
import { showFailToast, showSuccessToast } from 'vant'
import { computed, onMounted, ref } from 'vue'
import { usePilotStore } from '@/stores/pilot'
import { ORDER_TYPE_MAP, TERRAIN_MAP } from '@/types'

const pilotStore = usePilotStore()

const activeTab = ref('all')
const showDetail = ref(false)
const selectedOrder = ref<GrabbableOrder | null>(null)
const refreshing = ref(false)

const filteredOrders = computed(() => {
  let list = pilotStore.grabbableOrders.filter(o =>
    ['grabbable_gold', 'grabbable_senior', 'grabbable_all'].includes(o.status),
  )

  if (activeTab.value === 'gold') {
    list = list.filter(o => o.status === 'grabbable_gold')
  }
  else if (activeTab.value === 'basic') {
    list = list.filter(o => o.is_basic_order)
  }

  return list
})

function getOrderTypeName(type: string): string {
  return ORDER_TYPE_MAP[type] || type
}

function getTerrainName(terrain: string): string {
  return TERRAIN_MAP[terrain] || terrain
}

function getRemainingTime(grabEligibleAfter: string): number {
  const end = new Date(grabEligibleAfter).getTime()
  return Math.max(0, end - Date.now())
}

function getGrabWindowLabel(level: string): string {
  const map: Record<string, string> = {
    gold: '金牌优先中',
    senior: '资深可抢中',
    all: '全员可抢',
  }
  return map[level] || ''
}

function getGrabTip(order: GrabbableOrder): string {
  if (pilotStore.creditLevel === 'probation') {
    return '见习飞手仅可接基础订单'
  }

  const now = Date.now()
  const eligibleAfter = new Date(order.grab_eligible_after).getTime()
  if (now < eligibleAfter) {
    const seconds = Math.ceil((eligibleAfter - now) / 1000)
    return `${seconds}秒后开放`
  }

  return '暂无权限'
}

async function onRefresh() {
  refreshing.value = true
  await pilotStore.fetchGrabbableOrders()
  refreshing.value = false
}

function viewDetail(order: GrabbableOrder) {
  selectedOrder.value = order
  showDetail.value = true
}

function onGrabWindowExpired() {
  pilotStore.fetchGrabbableOrders()
}

async function handleToggleOnline() {
  const success = await pilotStore.toggleOnlineStatus()
  if (success) {
    showSuccessToast(pilotStore.onlineStatus ? '已上线' : '已下线')
  }
  else {
    showFailToast('状态更新失败')
  }
}

async function grabOrderHandler(order: GrabbableOrder) {
  const result = await pilotStore.grabOrder(order.id)
  if (result.success) {
    showSuccessToast('抢单成功')
    showDetail.value = false
  }
  else {
    showFailToast(result.error || '抢单失败')
  }
}

onMounted(() => {
  pilotStore.fetchGrabbableOrders()
})
</script>

<template>
  <div class="hall-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <span class="navbar-title">接单大厅</span>
      <button
        class="online-toggle"
        :class="{ active: pilotStore.onlineStatus }"
        @click="handleToggleOnline"
      >
        {{ pilotStore.onlineStatus ? '在线接单' : '离线' }}
      </button>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-bar">
      <van-tabs v-model:active="activeTab" shrink>
        <van-tab title="全部订单" name="all" />
        <van-tab title="金牌优先" name="gold" />
        <van-tab title="基础订单" name="basic" />
      </van-tabs>
    </div>

    <!-- 订单列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="order-list">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="order-card"
          @click="viewDetail(order)"
        >
          <div class="order-header">
            <span class="order-type-tag" :class="order.order_type">
              {{ getOrderTypeName(order.order_type) }}
            </span>
            <div v-if="order.current_eligible_level" class="grab-window">
              <van-count-down
                v-if="getRemainingTime(order.grab_eligible_after) > 0"
                :time="getRemainingTime(order.grab_eligible_after)"
                format="ss"
                @finish="onGrabWindowExpired"
              />
              <span class="window-label">{{ getGrabWindowLabel(order.current_eligible_level) }}</span>
            </div>
          </div>

          <div class="order-info">
            <div class="info-row">
              <van-icon name="location-o" />
              <span class="address">{{ order.pickup_address }}</span>
              <van-icon name="arrow" class="arrow-icon" />
              <span class="address">{{ order.delivery_address }}</span>
            </div>
            <div class="info-row secondary">
              <span>📦 {{ order.goods_type }} · {{ order.goods_weight }}kg</span>
              <span v-if="order.straight_line_distance">📍 {{ order.straight_line_distance }}km</span>
              <span v-if="order.altitude">🏔️ 海拔{{ order.altitude }}m</span>
            </div>
            <div v-if="order.elevation_diff || order.lifting_method" class="info-row secondary">
              <span v-if="order.elevation_diff">落差 {{ order.elevation_diff }}m</span>
              <span v-if="order.lifting_method">吊运方式: {{ order.lifting_method }}</span>
            </div>
          </div>

          <div class="price-section">
            <div class="price-main">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ order.final_price }}</span>
            </div>
            <div v-if="order.pilot_deposit_amount" class="pilot-deposit">
              飞手保证金: ¥{{ order.pilot_deposit_amount }}
            </div>
          </div>

          <div class="grab-btn-area">
            <van-button
              type="primary"
              size="small"
              :disabled="!pilotStore.canGrab(order)"
              @click.stop="grabOrderHandler(order)"
            >
              {{ pilotStore.canGrab(order) ? '立即抢单' : '暂无权限' }}
            </van-button>
            <div v-if="!pilotStore.canGrab(order)" class="grab-tip">
              {{ getGrabTip(order) }}
            </div>
          </div>
        </div>

        <van-empty v-if="!pilotStore.ordersLoading && filteredOrders.length === 0" description="暂无可用订单" />
        <van-loading v-if="pilotStore.ordersLoading" class="loading-indicator" size="24" vertical>
          加载中...
        </van-loading>
      </div>
    </van-pull-refresh>

    <!-- 订单详情弹窗 -->
    <van-popup v-model:show="showDetail" position="bottom" round closeable>
      <div v-if="selectedOrder" class="order-detail-popup">
        <div class="popup-header">
          <span class="title">订单详情</span>
        </div>
        <van-cell-group>
          <van-cell title="订单类型" :value="getOrderTypeName(selectedOrder.order_type)" />
          <van-cell title="物品" :value="`${selectedOrder.goods_type} · ${selectedOrder.goods_weight}kg`" />
          <van-cell v-if="selectedOrder.straight_line_distance" title="距离" :value="`${selectedOrder.straight_line_distance}km`" />
          <van-cell v-if="selectedOrder.altitude" title="海拔" :value="`${selectedOrder.altitude}m`" />
          <van-cell v-if="selectedOrder.elevation_diff" title="落差" :value="`${selectedOrder.elevation_diff}m`" />
          <van-cell title="地形" :value="getTerrainName(selectedOrder.terrain_type)" />
          <van-cell title="吊运方式" :value="selectedOrder.lifting_method || '标准吊运'" />
          <van-cell title="总费用" :value="`¥${selectedOrder.final_price}`" class="highlight-cell" />
          <van-cell v-if="selectedOrder.insurance_premium" title="保险费" :value="`¥${selectedOrder.insurance_premium}`" />
        </van-cell-group>
        <div class="popup-actions">
          <van-button
            type="primary"
            block
            round
            :disabled="!pilotStore.canGrab(selectedOrder)"
            @click="grabOrderHandler(selectedOrder)"
          >
            确认抢单
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style lang="scss" scoped>
.hall-page {
  min-height: 100vh;
  background: $color-bg-page;
  display: flex;
  flex-direction: column;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $navbar-height;
  padding: 0 $spacing-lg;
  background: white;
  border-bottom: 1px solid $color-border-light;
}

.navbar-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-semibold;
}

.online-toggle {
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  border: none;
  border-radius: $radius-md;
  background: $color-bg-input;
  color: $color-text-secondary;
  transition: all $transition-fast;

  &.active {
    background: $color-success;
    color: white;
  }
}

.filter-bar {
  background: white;
  position: sticky;
  top: $navbar-height;
  z-index: 99;
}

.order-list {
  flex: 1;
  padding: $spacing-md;
}

.order-card {
  background: white;
  border-radius: $radius-xl;
  padding: $spacing-xl;
  margin-bottom: $spacing-md;
  box-shadow: $shadow-sm;
  cursor: pointer;

  &:active {
    box-shadow: $shadow-md;
  }
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.order-type-tag {
  padding: $spacing-xs $spacing-md;
  border-radius: $radius-sm;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  background: $color-primary-bg;
  color: $color-primary;

  &.emergency {
    background: #FFF1F0;
    color: $color-danger;
  }
}

.grab-window {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  background: #FFF7E6;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
}

.window-label {
  font-size: $font-size-xs;
  color: $color-warning;
}

.order-info {
  margin-bottom: $spacing-md;
}

.info-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-lg;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;

  .address {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.arrow-icon {
  color: $color-text-placeholder;
}

.info-row.secondary {
  font-size: $font-size-md;
  color: $color-text-secondary;
  gap: $spacing-lg;
}

.price-section {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: $spacing-md;
}

.price-main {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: $font-size-lg;
  color: $color-danger;
}

.price-value {
  font-size: 28px;
  font-weight: $font-weight-bold;
  color: $color-danger;
}

.pilot-deposit {
  font-size: $font-size-xs;
  color: $color-text-placeholder;
}

.grab-btn-area {
  text-align: right;
}

.grab-tip {
  font-size: $font-size-xs;
  color: $color-text-placeholder;
  margin-top: $spacing-xs;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: $spacing-2xl;
}

// 订单详情弹窗
.order-detail-popup {
  padding: $spacing-xl;
  padding-bottom: calc(env(safe-area-inset-bottom) + $spacing-xl);
}

.popup-header {
  margin-bottom: $spacing-xl;

  .title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-semibold;
  }
}

.popup-actions {
  margin-top: $spacing-2xl;
}

:deep(.highlight-cell .van-cell__value) {
  color: $color-danger;
  font-weight: $font-weight-bold;
}
</style>
