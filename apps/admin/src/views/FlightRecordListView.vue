<template>
  <div>
    <h2 style="margin-bottom: 16px">飞行记录</h2>

    <a-table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'order_no'">
          {{ record.orders?.order_no || '-' }}
        </template>
        <template v-if="column.key === 'compliant'">
          <a-tag :color="record.is_compliant === true ? 'green' : record.is_compliant === false ? 'red' : 'default'">
            {{ record.is_compliant === true ? '合规' : record.is_compliant === false ? '异常' : '未检查' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'deviation'">
          {{ record.deviation_max_meters ? `${record.deviation_max_meters}m` : '-' }}
        </template>
        <template v-if="column.key === 'review'">
          <a-tag :color="{ approved: 'green', rejected: 'red', pending: 'orange' }[record.review_result] || 'default'">
            {{ { approved: '已通过', rejected: '已拒绝', pending: '待审核' }[record.review_result] || '未审核' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space v-if="!record.review_result || record.review_result === 'pending'">
            <a-button type="link" size="small" style="color: #52c41a" @click="handleReview(record, 'approved')">通过</a-button>
            <a-button type="link" size="small" style="color: #f5222d" @click="handleReview(record, 'rejected')">拒绝</a-button>
          </a-space>
          <span v-else style="color: #999">已处理</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listFlightRecords, updateFlightReview, type FlightRecord } from '@/api/flight-records'
import { message } from 'ant-design-vue'

const records = ref<FlightRecord[]>([])
const loading = ref(false)
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })

const columns = [
  { title: '订单号', key: 'order_no' },
  { title: '文件格式', dataIndex: 'file_format', key: 'file_format' },
  { title: '合规性', key: 'compliant' },
  { title: '最大偏差', key: 'deviation' },
  { title: '审核状态', key: 'review' },
  { title: '上传时间', dataIndex: 'uploaded_at', key: 'uploaded_at', customRender: ({ text }: any) => new Date(text).toLocaleString('zh-CN') },
  { title: '操作', key: 'action', width: 120 },
]

async function loadData() {
  loading.value = true
  try {
    const result = await listFlightRecords({ page: pagination.current })
    records.value = result.data
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  loadData()
}

async function handleReview(record: FlightRecord, result: 'approved' | 'rejected') {
  await updateFlightReview(record.id, result)
  message.success(result === 'approved' ? '已通过' : '已拒绝')
  loadData()
}

onMounted(loadData)
</script>
