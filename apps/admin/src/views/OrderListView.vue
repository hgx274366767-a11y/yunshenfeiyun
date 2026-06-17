<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">订单管理</h2>
      <a-space>
        <a-select v-model:value="statusFilter" placeholder="订单状态" allowClear style="width: 150px" @change="loadData">
          <a-select-option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
        </a-select>
        <a-select v-model:value="typeFilter" placeholder="订单类型" allowClear style="width: 140px" @change="loadData">
          <a-select-option value="agri_up">农资上山</a-select-option>
          <a-select-option value="agri_down">农产品下山</a-select-option>
          <a-select-option value="emergency">应急吊运</a-select-option>
          <a-select-option value="forestry">林业物资</a-select-option>
          <a-select-option value="construction">基建建材</a-select-option>
        </a-select>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="orders"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'customer'">
          {{ record.users?.real_name || record.users?.phone || '-' }}
        </template>
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
        </template>
        <template v-if="column.key === 'order_type'">
          {{ orderTypeLabel(record.order_type) }}
        </template>
        <template v-if="column.key === 'price'">
          ¥{{ record.final_price?.toFixed(2) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="$router.push(`/orders/${record.id}`)">详情</a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listOrders, type Order } from '@/api/orders'

const orders = ref<Order[]>([])
const loading = ref(false)
const statusFilter = ref<string | undefined>(undefined)
const typeFilter = ref<string | undefined>(undefined)
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })

const statusOptions = [
  { value: 'grabbable_gold', label: '金牌抢单' },
  { value: 'grabbable_senior', label: '资深抢单' },
  { value: 'grabbable_all', label: '全员抢单' },
  { value: 'accepted', label: '已接单' },
  { value: 'in_flight', label: '运输中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const columns = [
  { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 180 },
  { title: '客户', key: 'customer' },
  { title: '类型', key: 'order_type' },
  { title: '重量(kg)', dataIndex: 'goods_weight', key: 'goods_weight' },
  { title: '距离(km)', dataIndex: 'straight_line_distance', key: 'distance', customRender: ({ text }: any) => text?.toFixed(1) },
  { title: '金额', key: 'price' },
  { title: '状态', key: 'status' },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', customRender: ({ text }: any) => new Date(text).toLocaleString('zh-CN') },
  { title: '操作', key: 'action', width: 80 },
]

async function loadData() {
  loading.value = true
  try {
    const result = await listOrders({
      page: pagination.current,
      status: statusFilter.value,
      orderType: typeFilter.value,
    })
    orders.value = result.data
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  loadData()
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    completed: 'green', cancelled: 'red', accepted: 'blue', in_flight: 'orange',
    grabbable_gold: 'gold', grabbable_senior: 'cyan', grabbable_all: 'purple',
  }
  return map[s] || 'default'
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    grabbable_gold: '金牌抢单', grabbable_senior: '资深抢单', grabbable_all: '全员抢单',
    accepted: '已接单', in_flight: '运输中', completed: '已完成', cancelled: '已取消',
    pending: '待支付', dispatched: '派单中',
  }
  return map[s] || s
}

function orderTypeLabel(t: string) {
  return { agri_up: '农资上山', agri_down: '农产品下山', emergency: '应急吊运', forestry: '林业物资', construction: '基建建材' }[t] || t
}

onMounted(loadData)
</script>
