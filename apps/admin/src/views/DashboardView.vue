<template>
  <div>
    <h2 style="margin-bottom: 24px">仪表盘</h2>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="总订单数" :value="stats.total" :value-style="{ color: '#1890ff' }">
            <template #prefix><ShoppingOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="已完成" :value="stats.completed" :value-style="{ color: '#52c41a' }">
            <template #prefix><CheckCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="进行中" :value="stats.active" :value-style="{ color: '#faad14' }">
            <template #prefix><ClockCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic
            title="总收入"
            :value="stats.totalRevenue"
            :precision="2"
            prefix="¥"
            :value-style="{ color: '#f5222d' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" style="margin-top: 16px">
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="注册用户" :value="userStats.total" :value-style="{ color: '#722ed1' }">
            <template #prefix><UserOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="客户数" :value="userStats.clients" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="飞手数" :value="userStats.pilots" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic title="待审核飞手" :value="pendingPilots" :value-style="{ color: '#faad14' }">
            <template #prefix><ExclamationCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import { getOrderStats } from '@/api/orders'
import { getUserStats } from '@/api/users'
import { listPilots } from '@/api/pilots'

const stats = ref({ total: 0, completed: 0, active: 0, totalRevenue: 0 })
const userStats = ref({ total: 0, clients: 0, pilots: 0 })
const pendingPilots = ref(0)

onMounted(async () => {
  try {
    const [orderStats, uStats, pilotData] = await Promise.all([
      getOrderStats(),
      getUserStats(),
      listPilots({ certStatus: 'pending', pageSize: 1 }),
    ])
    stats.value = orderStats
    userStats.value = uStats
    pendingPilots.value = pilotData.total
  } catch (err) {
    console.error('Dashboard load error:', err)
  }
})
</script>
