<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">用户管理</h2>
      <a-space>
        <a-select v-model:value="roleFilter" placeholder="用户角色" allowClear style="width: 130px" @change="loadData">
          <a-select-option value="client">客户</a-select-option>
          <a-select-option value="pilot">飞手</a-select-option>
          <a-select-option value="admin">管理员</a-select-option>
        </a-select>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="{ client: 'blue', pilot: 'green', admin: 'gold' }[record.role] || 'default'">
            {{ { client: '客户', pilot: '飞手', admin: '管理员' }[record.role] || record.role }}
          </a-tag>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge :status="record.status === 'active' ? 'success' : 'error'" :text="record.status === 'active' ? '正常' : record.status" />
        </template>
        <template v-if="column.key === 'credit'">
          <span :style="{ color: record.credit_score >= 85 ? '#52c41a' : record.credit_score >= 70 ? '#faad14' : '#f5222d' }">
            {{ record.credit_score }} ({{ record.credit_level }})
          </span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listUsers, type User } from '@/api/users'

const users = ref<User[]>([])
const loading = ref(false)
const roleFilter = ref<string | undefined>(undefined)
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })

const columns = [
  { title: '手机号', dataIndex: 'phone', key: 'phone' },
  { title: '姓名', dataIndex: 'real_name', key: 'real_name', customRender: ({ text }: any) => text || '-' },
  { title: '角色', key: 'role' },
  { title: '状态', key: 'status' },
  { title: '信用分', key: 'credit' },
  { title: '注册时间', dataIndex: 'created_at', key: 'created_at', customRender: ({ text }: any) => new Date(text).toLocaleDateString('zh-CN') },
  { title: '最后登录', dataIndex: 'last_login_at', key: 'last_login', customRender: ({ text }: any) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
]

async function loadData() {
  loading.value = true
  try {
    const result = await listUsers({ page: pagination.current, role: roleFilter.value })
    users.value = result.data
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  loadData()
}

onMounted(loadData)
</script>
