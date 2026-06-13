<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useOrdersStore } from '@/stores/orders'
import { GOODS_TYPE_OPTIONS, LIFTING_METHOD_OPTIONS, URGENCY_OPTIONS } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const ordersStore = useOrdersStore()

// 表单数据
const form = ref({
  pickup_address: '',
  delivery_address: '',
  goods_type: '',
  goods_desc: '',
  goods_weight: '' as string | number,
  altitude: '' as string | number,
  elevation_diff: '' as string | number,
  lifting_method: '标准吊运',
  urgency: 'today',
  contact_phone: '',
  remark: '',
})

const showGoodsTypePicker = ref(false)
const showLiftingMethodPicker = ref(false)
const priceLoading = ref(false)
const submitLoading = ref(false)

// Picker 列数据
const goodsTypeColumns = GOODS_TYPE_OPTIONS.map(v => ({ text: v, value: v }))
const liftingMethodColumns = LIFTING_METHOD_OPTIONS.map(v => ({ text: v, value: v }))

// 实时价格估算
const estimatedPrice = computed(() => ordersStore.priceEstimate)

// 表单验证
const isValid = computed(() => {
  return (
    form.value.pickup_address.trim() !== ''
    && form.value.delivery_address.trim() !== ''
    && form.value.goods_type !== ''
    && Number(form.value.goods_weight) > 0
    && Number(form.value.altitude) > 0
    && Number(form.value.elevation_diff) >= 0
    && form.value.contact_phone.trim() !== ''
    && form.value.contact_phone.length === 11
  )
})

// 监听重量和海拔变化，自动估算价格
watch(
  () => [form.value.goods_weight, form.value.altitude, form.value.elevation_diff, form.value.urgency],
  async () => {
    const weight = Number(form.value.goods_weight)
    const altitude = Number(form.value.altitude)
    const elevation = Number(form.value.elevation_diff)
    if (weight > 0 && altitude > 0) {
      priceLoading.value = true
      await ordersStore.estimatePrice({
        goods_weight: weight,
        altitude,
        elevation_diff: elevation,
        urgency: form.value.urgency,
      })
      priceLoading.value = false
    }
  },
  { deep: true },
)

function goBack() {
  router.back()
}

function onGoodsTypeConfirm({ selectedOptions }: { selectedOptions: Array<{ text: string, value: string }> }) {
  form.value.goods_type = selectedOptions[0]?.value || ''
  showGoodsTypePicker.value = false
}

function onLiftingMethodConfirm({ selectedOptions }: { selectedOptions: Array<{ text: string, value: string }> }) {
  form.value.lifting_method = selectedOptions[0]?.value || '标准吊运'
  showLiftingMethodPicker.value = false
}

async function handleSubmit() {
  if (!isValid.value) {
    showFailToast('请填写完整信息')
    return
  }

  submitLoading.value = true
  const { data, error } = await ordersStore.createOrder({
    goods_type: form.value.goods_type,
    goods_weight: Number(form.value.goods_weight),
    goods_desc: form.value.goods_desc || undefined,
    pickup_address: form.value.pickup_address,
    delivery_address: form.value.delivery_address,
    altitude: Number(form.value.altitude),
    elevation_diff: Number(form.value.elevation_diff),
    lifting_method: form.value.lifting_method,
    urgency: form.value.urgency,
    contact_phone: form.value.contact_phone,
    remark: form.value.remark || undefined,
  })
  submitLoading.value = false

  if (error) {
    showFailToast(error || '下单失败')
    return
  }

  showSuccessToast('下单成功')
  if (data) {
    router.replace(`/orders/${data.id}`)
  }
  else {
    router.replace('/orders')
  }
}

onMounted(() => {
  // 预填联系人手机号
  if (authStore.user?.phone) {
    form.value.contact_phone = authStore.user.phone
  }
})
</script>

<template>
  <div class="create-order-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <van-icon name="arrow-left" class="back-icon" @click="goBack" />
      <span class="navbar-title">发布吊运需求</span>
    </div>

    <div class="form-container">
      <!-- 地址信息 -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            📍
          </div>
          <span class="section-title">地址信息</span>
        </div>
        <div class="form-card">
          <div class="form-row">
            <label class="form-label">起始地址 <span class="required">*</span></label>
            <van-field
              v-model="form.pickup_address"
              placeholder="请输入起始地址"
              :border="false"
              class="custom-field"
            />
          </div>
          <div class="form-row">
            <label class="form-label">目的地址 <span class="required">*</span></label>
            <van-field
              v-model="form.delivery_address"
              placeholder="请输入目的地址"
              :border="false"
              class="custom-field"
            />
          </div>
        </div>
      </div>

      <!-- 货物信息 -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            📦
          </div>
          <span class="section-title">货物信息</span>
        </div>
        <div class="form-card">
          <div class="form-row">
            <label class="form-label">货物类型 <span class="required">*</span></label>
            <van-field
              v-model="form.goods_type"
              placeholder="请选择货物类型"
              readonly
              is-link
              :border="false"
              class="custom-field"
              @click="showGoodsTypePicker = true"
            />
          </div>
          <div class="form-row">
            <label class="form-label">货物描述</label>
            <van-field
              v-model="form.goods_desc"
              type="textarea"
              placeholder="请描述货物信息，如：新鲜脐橙 500箱"
              rows="2"
              :border="false"
              class="custom-field"
            />
          </div>
          <div class="form-row">
            <label class="form-label">重量 <span class="required">*</span></label>
            <van-field
              v-model="form.goods_weight"
              type="digit"
              placeholder="请输入货物重量"
              :border="false"
              class="custom-field"
            >
              <template #extra>
                <span class="field-unit">kg</span>
              </template>
            </van-field>
          </div>
        </div>
      </div>

      <!-- 飞行参数 -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            ✈️
          </div>
          <span class="section-title">飞行参数</span>
        </div>
        <div class="form-card">
          <div class="form-row">
            <label class="form-label">海拔高度 <span class="required">*</span></label>
            <van-field
              v-model="form.altitude"
              type="digit"
              placeholder="请输入起始点海拔高度"
              :border="false"
              class="custom-field"
            >
              <template #extra>
                <span class="field-unit">m</span>
              </template>
            </van-field>
          </div>
          <div class="form-row">
            <label class="form-label">落差 <span class="required">*</span></label>
            <van-field
              v-model="form.elevation_diff"
              type="digit"
              placeholder="请输入起终点击落差"
              :border="false"
              class="custom-field"
            >
              <template #extra>
                <span class="field-unit">m</span>
              </template>
            </van-field>
          </div>
          <div class="form-row">
            <label class="form-label">吊运方式 <span class="required">*</span></label>
            <van-field
              v-model="form.lifting_method"
              readonly
              is-link
              :border="false"
              class="custom-field"
              @click="showLiftingMethodPicker = true"
            />
          </div>
          <div class="form-row">
            <label class="form-label">时效要求 <span class="required">*</span></label>
            <div class="urgency-group">
              <div
                v-for="option in URGENCY_OPTIONS"
                :key="option.value"
                class="urgency-btn"
                :class="{ active: form.urgency === option.value }"
                @click="form.urgency = option.value"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 联系方式 -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            📞
          </div>
          <span class="section-title">联系方式</span>
        </div>
        <div class="form-card">
          <div class="form-row">
            <label class="form-label">联系电话 <span class="required">*</span></label>
            <van-field
              v-model="form.contact_phone"
              type="tel"
              placeholder="请输入联系电话"
              maxlength="11"
              :border="false"
              class="custom-field"
            />
          </div>
          <div class="form-row">
            <label class="form-label">备注</label>
            <van-field
              v-model="form.remark"
              placeholder="如有特殊要求请填写"
              :border="false"
              class="custom-field"
            />
          </div>
        </div>
      </div>

      <!-- 价格估算 -->
      <div v-if="estimatedPrice" class="price-summary">
        <div class="price-header">
          <span class="price-title">费用估算</span>
          <van-loading v-if="priceLoading" size="14" />
        </div>
        <div class="price-breakdown">
          <div class="price-row">
            <span>基础费用</span>
            <span>¥{{ estimatedPrice.base_price }}</span>
          </div>
          <div v-if="estimatedPrice.weight_fee" class="price-row">
            <span>重量附加</span>
            <span>¥{{ estimatedPrice.weight_fee }}</span>
          </div>
          <div v-if="estimatedPrice.altitude_fee" class="price-row">
            <span>海拔附加</span>
            <span>¥{{ estimatedPrice.altitude_fee }}</span>
          </div>
          <div v-if="estimatedPrice.urgency_fee" class="price-row">
            <span>时效附加</span>
            <span>¥{{ estimatedPrice.urgency_fee }}</span>
          </div>
          <div class="price-total">
            <span>预估总价</span>
            <span class="total-value">¥{{ estimatedPrice.total_price }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部提交按钮 -->
    <div class="submit-area safe-area-bottom">
      <van-button
        type="primary"
        block
        round
        :loading="submitLoading"
        :disabled="!isValid"
        @click="handleSubmit"
      >
        发布需求
      </van-button>
    </div>

    <!-- 货物类型选择器 -->
    <van-popup v-model:show="showGoodsTypePicker" position="bottom" round>
      <van-picker
        :columns="goodsTypeColumns"
        @confirm="onGoodsTypeConfirm"
        @cancel="showGoodsTypePicker = false"
      />
    </van-popup>

    <!-- 吊运方式选择器 -->
    <van-popup v-model:show="showLiftingMethodPicker" position="bottom" round>
      <van-picker
        :columns="liftingMethodColumns"
        @confirm="onLiftingMethodConfirm"
        @cancel="showLiftingMethodPicker = false"
      />
    </van-popup>
  </div>
</template>

<style lang="scss" scoped>
.create-order-page {
  min-height: 100vh;
  background: $color-bg-page;
  padding-bottom: 80px;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: $navbar-height;
  padding: 0 $spacing-lg;
  background: white;
  border-bottom: 1px solid $color-border-light;
}

.back-icon {
  font-size: 20px;
  color: $color-text-primary;
  margin-right: $spacing-md;
  cursor: pointer;
}

.navbar-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-semibold;
}

.form-container {
  padding: $spacing-md $spacing-lg;
}

.section {
  margin-bottom: $spacing-lg;
}

.section-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md 0;
}

.section-icon {
  font-size: 18px;
}

.section-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.form-card {
  background: white;
  border-radius: $radius-xl;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;
}

.form-row {
  margin-bottom: $spacing-lg;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
  padding-left: $spacing-xs;
}

.required {
  color: $color-danger;
  margin-left: 2px;
}

.custom-field {
  background: $color-bg-input;
  border-radius: $radius-md;
  padding: $spacing-sm $spacing-md;

  :deep(.van-field__control) {
    font-size: $font-size-lg;
  }
}

.field-unit {
  font-size: $font-size-md;
  color: $color-text-secondary;
}

.urgency-group {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.urgency-btn {
  padding: $spacing-md $spacing-lg;
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: white;
  color: $color-text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &.active {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;
  }

  &:active {
    transform: scale(0.96);
  }
}

.price-summary {
  background: white;
  border-radius: $radius-xl;
  padding: $spacing-xl;
  margin-bottom: $spacing-lg;
  box-shadow: $shadow-sm;
}

.price-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;
}

.price-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: $spacing-sm 0;
  font-size: $font-size-md;
  color: $color-text-secondary;
}

.price-total {
  display: flex;
  justify-content: space-between;
  padding-top: $spacing-md;
  margin-top: $spacing-sm;
  border-top: 1px solid $color-border-light;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.total-value {
  color: $color-danger;
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
}

.submit-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-lg $spacing-xl;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}
</style>
