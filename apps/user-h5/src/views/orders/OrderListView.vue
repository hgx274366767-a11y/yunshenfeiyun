<script setup lang="ts">
import type { Order, OrderStatus } from '@/types'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'
import { ORDER_STATUS_MAP } from '@/types'

const router = useRouter()
const ordersStore = useOrdersStore()

const activeTab = ref('all')
const refreshing = ref(false)

const tabs = [
  { name: 'all', title: '全部' },
  { name: 'active', title: '进行中' },
  { name: 'completed', title: '已完成' },
]

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') {
    return ordersStore.orders
  }
  if (activeTab.value === 'active') {
    return ordersStore.orders.filter((o: Order) =>
      ['pending', 'accepted', 'in_progress'].includes(o.status),
    )
  }
  if (activeTab.value === 'completed') {
    return ordersStore.orders.filter((o: Order) => o.status === 'completed')
  }
  return ordersStore.orders
})

function getStatusInfo(status: OrderStatus) {
  return ORDER_STATUS_MAP[status] || { label: status, class: '' }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function viewDetail(orderId: string) {
  router.push(`/orders/${orderId}`)
}

async function onRefresh() {
  refreshing.value = true
  await ordersStore.fetchOrders()
  refreshing.value = false
}

onMounted(() => {
  ordersStore.fetchOrders()
})
</script>

<template>
  <div class="order-list-page page-with-tabbar">
    <!-- 顶部导航 -->
    <div class="navbar">
      <span class="navbar-title">我的订单</span>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-bar">
      <van-tabs v-model:active="activeTab" shrink>
        <van-tab
          v-for="tab in tabs"
          :key="tab.name"
          :title="tab.title"
          :name="tab.name"
        />
      </van-tabs>
    </div>

    <!-- 订单列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="order-list">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="order-card"
          @click="viewDetail(order.id)"
        >
          <div class="order-header">
            <span class="order-id">#{{ order.id.slice(-8) }}</span>
            <span class="order-status" :class="getStatusInfo(order.status).class">
              {{ getStatusInfo(order.status).label }}
            </span>
          </div>

          <div class="order-route">
            <span class="route-text start">{{ order.pickup_address.slice(0, 6) }}</span>
            <div class="route-dot start" />
            <div class="route-line" />
            <div class="route-dot end" />
            <span class="route-text">{{ order.delivery_address.slice(0, 6) }}</span>
          </div>

          <div class="order-info">
            <div class="info-item">
              <div class="info-value">
                {{ order.goods_weight }}
              </div>
              <div class="info-label">
                重量(kg)
              </div>
            </div>
            <div class="info-item">
              <div class="info-value">
                {{ order.altitude }}
              </div>
              <div class="info-label">
                海拔(m)
              </div>
            </div>
            <div class="info-item">
              <div class="info-value">
                {{ order.elevation_diff }}
              </div>
              <div class="info-label">
                落差(m)
              </div>
            </div>
            <div class="info-item">
              <div class="info-value price">
                ¥{{ order.price || '--' }}
              </div>
              <div class="info-label">
                费用
              </div>
            </div>
          </div>

          <div class="order-footer">
            <span class="order-time">{{ formatDate(order.created_at) }}</span>
            <span class="order-goods">{{ order.goods_type }}</span>
          </div>
        </div>

        <van-empty v-if="!ordersStore.loading && filteredOrders.length === 0" description="暂无订单" />
        <van-loading v-if="ordersStore.loading" class="loading-indicator" size="24" vertical>
          加载中...
        </van-loading>
      </div>
    </van-pull-refresh>
  </div>
</template>

<style lang="scss" scoped>
.order-list-page {
  min-height: 100vh;
  background: $color-bg-page;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  height: $navbar-height;
  padding: 0 $spacing-lg;
  background: white;
  border-bottom: 1px solid $color-border-light;
}

.navbar-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-semibold;
}

.filter-bar {
  background: white;
  position: sticky;
  top: $navbar-height;
  z-index: 99;
}

.order-list {
  padding: $spacing-md;
}

.order-card {
  background: white;
  border-radius: $radius-xl;
  padding: $spacing-xl;
  margin-bottom: $spacing-md;
  box-shadow: $shadow-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-md;
  }
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.order-id {
  font-size: $font-size-md;
  color: $color-text-secondary;
}

.order-status {
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  border-radius: 12px;
}

.order-route {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
}

.route-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.start {
    background: $color-primary;
  }

  &.end {
    background: $color-success;
  }
}

.route-line {
  flex: 1;
  height: 1px;
  background: $color-border;
}

.route-text {
  font-size: $font-size-md;
  color: $color-text-secondary;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.start {
    text-align: right;
  }
}

.order-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-sm;
  padding-top: $spacing-md;
  border-top: 1px solid $color-border-light;
}

.info-item {
  text-align: center;
}

.info-value {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;

  &.price {
    color: $color-danger;
  }
}

.info-label {
  font-size: $font-size-xs;
  color: $color-text-placeholder;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid $color-border-light;
}

.order-time {
  font-size: $font-size-sm;
  color: $color-text-placeholder;
}

.order-goods {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  background: $color-bg-input;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: $spacing-2xl;
}
</style>
