<template>
  <div v-if="order">
    <a-page-header :title="`订单 ${order.order_no}`" @back="$router.back()">
      <template #extra>
        <a-dropdown>
          <a-button>手动调整状态</a-button>
          <template #overlay>
            <a-menu @click="handleStatusChange">
              <a-menu-item key="manual_intervention">人工介入</a-menu-item>
              <a-menu-item key="cancelled">强制取消</a-menu-item>
              <a-menu-item key="completed">强制完成</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>
    </a-page-header>

    <a-row :gutter="24">
      <a-col :xs="24" :lg="12">
        <a-card title="订单信息">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="订单号">{{ order.order_no }}</a-descriptions-item>
            <a-descriptions-item label="订单类型">{{ orderTypeLabel(order.order_type) }}</a-descriptions-item>
            <a-descriptions-item label="货物类型">{{ order.goods_type }}</a-descriptions-item>
            <a-descriptions-item label="重量">{{ order.goods_weight }} kg</a-descriptions-item>
            <a-descriptions-item label="地形">{{ order.terrain_type }}</a-descriptions-item>
            <a-descriptions-item label="直线距离">{{ order.straight_line_distance?.toFixed(2) }} km</a-descriptions-item>
            <a-descriptions-item label="最终价格">¥{{ order.final_price?.toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="statusColor(order.status)">{{ order.status }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12">
        <a-card title="地址信息">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="取货地址">{{ order.pickup_address }}</a-descriptions-item>
            <a-descriptions-item label="送货地址">{{ order.delivery_address }}</a-descriptions-item>
            <a-descriptions-item label="客户">{{ order.users?.real_name || order.users?.phone }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ new Date(order.created_at).toLocaleString('zh-CN') }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
  <a-spin v-else style="display: flex; justify-content: center; margin-top: 100px" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderDetail, updateOrderStatus } from '@/api/orders'
import { message, Modal } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const order = ref<any>(null)

async function loadData() {
  order.value = await getOrderDetail(route.params.id as string)
}

function orderTypeLabel(t: string) {
  return { agri_up: '农资上山', agri_down: '农产品下山', emergency: '应急吊运', forestry: '林业物资', construction: '基建建材' }[t] || t
}

function statusColor(s: string) {
  return { completed: 'green', cancelled: 'red', accepted: 'blue', in_flight: 'orange' }[s] || 'default'
}

function handleStatusChange({ key }: { key: string }) {
  const labels: Record<string, string> = { manual_intervention: '人工介入', cancelled: '强制取消', completed: '强制完成' }
  Modal.confirm({
    title: `确认${labels[key]}`,
    content: `将订单状态调整为「${labels[key]}」，此操作不可撤销`,
    onOk: async () => {
      await updateOrderStatus(order.value.id, key, `管理员操作: ${labels[key]}`)
      message.success('状态已更新')
      loadData()
    },
  })
}

onMounted(loadData)
</script>
