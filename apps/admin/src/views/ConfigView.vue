<template>
  <div>
    <h2 style="margin-bottom: 16px">系统配置</h2>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="pricing" tab="定价配置">
        <a-spin :spinning="pricingLoading">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :xs="24" :sm="12" :lg="8" v-for="item in pricingItems" :key="item.key">
                <a-card size="small" :title="item.label" style="margin-bottom: 12px">
                  <a-input-number
                    v-model:value="item.value"
                    :step="item.step || 0.1"
                    :min="0"
                    style="width: 100%"
                  />
                  <div style="color: #999; font-size: 12px; margin-top: 4px">{{ item.desc }}</div>
                </a-card>
              </a-col>
            </a-row>
            <a-button type="primary" :loading="saving" @click="savePricing">保存定价配置</a-button>
          </a-form>
        </a-spin>
      </a-tab-pane>

      <a-tab-pane key="system" tab="系统参数">
        <a-spin :spinning="systemLoading">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :xs="24" :sm="12" :lg="8" v-for="item in systemItems" :key="item.key">
                <a-card size="small" :title="item.label" style="margin-bottom: 12px">
                  <a-input-number
                    v-model:value="item.value"
                    :step="item.step || 1"
                    :min="0"
                    style="width: 100%"
                  />
                  <div style="color: #999; font-size: 12px; margin-top: 4px">{{ item.desc }}</div>
                </a-card>
              </a-col>
            </a-row>
            <a-button type="primary" :loading="saving" @click="saveSystem">保存系统参数</a-button>
          </a-form>
        </a-spin>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '@/api/supabase'
import { message } from 'ant-design-vue'

const activeTab = ref('pricing')
const pricingLoading = ref(false)
const systemLoading = ref(false)
const saving = ref(false)

interface ConfigItem {
  key: string
  label: string
  value: number
  desc: string
  step?: number
}

const pricingItems = reactive<ConfigItem[]>([
  { key: 'unit_price', label: '单价基准 (元/km)', value: 3.5, desc: '每公里基础运费', step: 0.1 },
  { key: 'price_floor', label: '价格下限 (折)', value: 0.7, desc: '最低7折', step: 0.05 },
  { key: 'price_ceiling', label: '价格上限 (倍)', value: 3.0, desc: '最高3倍', step: 0.1 },
])

const systemItems = reactive<ConfigItem[]>([
  { key: 'deposit_ratio', label: '保证金比例', value: 0.5, desc: '订单总价的50%', step: 0.05 },
  { key: 'large_order_threshold', label: '大额订单阈值 (元)', value: 5000, desc: '触发保证金险', step: 100 },
  { key: 'gold_window', label: '金牌优先窗口 (分钟)', value: 5, desc: '金牌飞手优先抢单', step: 1 },
  { key: 'senior_window', label: '资深窗口 (分钟)', value: 5, desc: '资深飞手可抢', step: 1 },
  { key: 'auto_dispatch_hours', label: '自动派单触发 (小时)', value: 48, desc: '无人接单后', step: 1 },
  { key: 'confirm_timeout', label: '派单确认超时 (分钟)', value: 15, desc: '', step: 1 },
  { key: 'reject_free_count', label: '每月免扣拒绝次数', value: 3, desc: '', step: 1 },
  { key: 'reject_deduction', label: '超限拒绝扣分', value: 2, desc: '', step: 1 },
])

async function loadPricing() {
  pricingLoading.value = true
  try {
    const { data } = await supabase.from('pricing_config').select('config_key, config_value')
    if (data) {
      for (const item of pricingItems) {
        const found = data.find((d: any) => d.config_key === item.key)
        if (found?.config_value?.value !== undefined) {
          item.value = found.config_value.value
        }
      }
    }
  } finally {
    pricingLoading.value = false
  }
}

async function loadSystem() {
  systemLoading.value = true
  try {
    const { data } = await supabase.from('system_config').select('config_key, config_value')
    if (data) {
      const map: Record<string, ConfigItem> = {
        'payment.deposit_ratio': systemItems[0],
        'payment.large_order_threshold': systemItems[1],
        'grab.gold_window_minutes': systemItems[2],
        'grab.senior_window_minutes': systemItems[3],
        'dispatch.auto_dispatch_hours': systemItems[4],
        'dispatch.confirm_timeout_minutes': systemItems[5],
        'dispatch.reject_free_count_monthly': systemItems[6],
        'dispatch.reject_deduction': systemItems[7],
      }
      for (const [key, item] of Object.entries(map)) {
        const found = data.find((d: any) => `${d.config_group}.${d.config_key}` === key)
        if (found?.config_value?.value !== undefined) {
          item.value = found.config_value.value
        }
      }
    }
  } finally {
    systemLoading.value = false
  }
}

async function savePricing() {
  saving.value = true
  try {
    for (const item of pricingItems) {
      await supabase
        .from('pricing_config')
        .update({ config_value: { value: item.value } })
        .eq('config_key', item.key)
    }
    message.success('定价配置已保存')
  } catch (err: any) {
    message.error(err.message)
  } finally {
    saving.value = false
  }
}

async function saveSystem() {
  saving.value = true
  try {
    const updates = [
      { group: 'payment', key: 'deposit_ratio', value: systemItems[0].value },
      { group: 'payment', key: 'large_order_threshold', value: systemItems[1].value },
      { group: 'grab', key: 'gold_window_minutes', value: systemItems[2].value },
      { group: 'grab', key: 'senior_window_minutes', value: systemItems[3].value },
      { group: 'dispatch', key: 'auto_dispatch_hours', value: systemItems[4].value },
      { group: 'dispatch', key: 'confirm_timeout_minutes', value: systemItems[5].value },
      { group: 'dispatch', key: 'reject_free_count_monthly', value: systemItems[6].value },
      { group: 'dispatch', key: 'reject_deduction', value: systemItems[7].value },
    ]
    for (const u of updates) {
      await supabase
        .from('system_config')
        .update({ config_value: { value: u.value } })
        .eq('config_group', u.group)
        .eq('config_key', u.key)
    }
    message.success('系统参数已保存')
  } catch (err: any) {
    message.error(err.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPricing()
  loadSystem()
})
</script>
