<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">飞手管理</h2>
      <a-space>
        <a-select v-model:value="certFilter" placeholder="认证状态" allowClear style="width: 140px" @change="loadData">
          <a-select-option value="pending">待审核</a-select-option>
          <a-select-option value="approved">已通过</a-select-option>
          <a-select-option value="rejected">已拒绝</a-select-option>
        </a-select>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="pilots"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'phone'">
          {{ record.users?.phone || '-' }}
        </template>
        <template v-if="column.key === 'name'">
          {{ record.users?.real_name || '-' }}
        </template>
        <template v-if="column.key === 'cert_status'">
          <a-tag :color="certColor(record.cert_status)">
            {{ certLabel(record.cert_status) }}
          </a-tag>
        </template>
        <template v-if="column.key === 'online_status'">
          <a-badge :status="record.online_status === 'online' ? 'success' : 'default'" :text="onlineLabel(record.online_status)" />
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="$router.push(`/pilots/${record.id}`)">详情</a-button>
            <a-button
              v-if="record.cert_status === 'pending'"
              type="link"
              size="small"
              style="color: #52c41a"
              @click="handleApprove(record)"
            >通过</a-button>
            <a-button
              v-if="record.cert_status === 'pending'"
              type="link"
              size="small"
              style="color: #f5222d"
              @click="handleReject(record)"
            >拒绝</a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listPilots, updateCertStatus, type Pilot } from '@/api/pilots'
import { message, Modal } from 'ant-design-vue'

const pilots = ref<Pilot[]>([])
const loading = ref(false)
const certFilter = ref<string | undefined>(undefined)
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })

const columns = [
  { title: '姓名', key: 'name', dataIndex: 'users.real_name' },
  { title: '手机号', key: 'phone', dataIndex: 'users.phone' },
  { title: '执照类型', dataIndex: 'license_type', key: 'license_type' },
  { title: '机型', dataIndex: 'drone_model', key: 'drone_model' },
  { title: '认证状态', key: 'cert_status' },
  { title: '在线状态', key: 'online_status' },
  { title: '完成订单', dataIndex: 'completed_orders', key: 'completed_orders' },
  { title: '评分', dataIndex: 'avg_rating', key: 'avg_rating' },
  { title: '操作', key: 'action', width: 160 },
]

async function loadData() {
  loading.value = true
  try {
    const result = await listPilots({
      page: pagination.current,
      pageSize: pagination.pageSize,
      certStatus: certFilter.value,
    })
    pilots.value = result.data
    pagination.total = result.total
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  loadData()
}

function certColor(status: string) {
  return { pending: 'orange', approved: 'green', rejected: 'red' }[status] || 'default'
}

function certLabel(status: string) {
  return { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[status] || status
}

function onlineLabel(status: string) {
  return { online: '在线', busy: '忙碌', offline: '离线' }[status] || status
}

async function handleApprove(pilot: Pilot) {
  try {
    await updateCertStatus(pilot.id, 'approved')
    message.success('已通过审核')
    loadData()
  } catch (err: any) {
    message.error(err.message)
  }
}

function handleReject(pilot: Pilot) {
  Modal.confirm({
    title: '确认拒绝',
    content: '请输入拒绝原因',
    onOk: async () => {
      try {
        await updateCertStatus(pilot.id, 'rejected', '资质不符合要求')
        message.success('已拒绝')
        loadData()
      } catch (err: any) {
        message.error(err.message)
      }
    },
  })
}

onMounted(loadData)
</script>
