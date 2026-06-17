<template>
  <div v-if="pilot">
    <a-page-header title="飞手详情" @back="$router.back()">
      <template #extra>
        <a-space v-if="pilot.cert_status === 'pending'">
          <a-button type="primary" @click="handleApprove">通过审核</a-button>
          <a-button danger @click="handleReject">拒绝</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-row :gutter="24">
      <a-col :xs="24" :lg="12">
        <a-card title="基本信息">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="手机号">{{ pilot.users?.phone }}</a-descriptions-item>
            <a-descriptions-item label="姓名">{{ pilot.users?.real_name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="信用分">{{ pilot.users?.credit_score }}</a-descriptions-item>
            <a-descriptions-item label="信用等级">{{ pilot.users?.credit_level }}</a-descriptions-item>
            <a-descriptions-item label="认证状态">
              <a-tag :color="pilot.cert_status === 'approved' ? 'green' : pilot.cert_status === 'rejected' ? 'red' : 'orange'">
                {{ { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[pilot.cert_status] }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="pilot.cert_reject_reason" label="拒绝原因">
              {{ pilot.cert_reject_reason }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12">
        <a-card title="资质信息">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="执照类型">{{ pilot.license_type || '-' }}</a-descriptions-item>
            <a-descriptions-item label="执照编号">{{ pilot.license_no || '-' }}</a-descriptions-item>
            <a-descriptions-item label="无人机型号">{{ pilot.drone_model || '-' }}</a-descriptions-item>
            <a-descriptions-item label="无人机序列号">{{ pilot.drone_serial || '-' }}</a-descriptions-item>
            <a-descriptions-item label="登记号">{{ pilot.drone_reg_no || '-' }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="运营数据" style="margin-top: 16px">
      <a-row :gutter="16">
        <a-col :span="6"><a-statistic title="总订单" :value="pilot.total_orders" /></a-col>
        <a-col :span="6"><a-statistic title="已完成" :value="pilot.completed_orders" /></a-col>
        <a-col :span="6"><a-statistic title="平均评分" :value="pilot.avg_rating" :precision="1" /></a-col>
        <a-col :span="6"><a-statistic title="在线状态" :value="pilot.online_status === 'online' ? '在线' : '离线'" /></a-col>
      </a-row>
    </a-card>
  </div>
  <a-spin v-else style="display: flex; justify-content: center; margin-top: 100px" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPilotDetail, updateCertStatus } from '@/api/pilots'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const pilot = ref<any>(null)

async function loadData() {
  pilot.value = await getPilotDetail(route.params.id as string)
}

async function handleApprove() {
  await updateCertStatus(pilot.value.id, 'approved')
  message.success('已通过')
  loadData()
}

function handleReject() {
  import('ant-design-vue').then(({ Modal }) => {
    Modal.confirm({
      title: '拒绝审核',
      content: '确认拒绝该飞手认证？',
      onOk: async () => {
        await updateCertStatus(pilot.value.id, 'rejected', '资质不符合要求')
        message.success('已拒绝')
        loadData()
      },
    })
  })
}

onMounted(loadData)
</script>
