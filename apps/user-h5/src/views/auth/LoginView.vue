<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const phone = ref('')
const code = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

async function sendCode() {
  if (!phone.value || phone.value.length < 11) {
    return
  }
  const { error } = await authStore.sendOtp(phone.value)
  if (error) {
    return
  }
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleLogin() {
  if (!phone.value || !code.value) {
    return
  }
  const { error } = await authStore.login(phone.value, code.value)
  if (error) {
    return
  }
  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
}
</script>

<template>
  <div class="login-page">
    <div class="header">
      <div class="logo">
        🚁
      </div>
      <h1 class="title">
        云深飞运
      </h1>
      <p class="subtitle">
        川渝首个无人机吊运服务平台
      </p>
    </div>

    <div class="form-card">
      <van-cell-group inset>
        <van-field
          v-model="phone"
          type="tel"
          label="手机号"
          placeholder="请输入手机号"
          maxlength="11"
        />
        <van-field
          v-model="code"
          type="number"
          label="验证码"
          placeholder="请输入验证码"
          maxlength="6"
        >
          <template #button>
            <van-button
              size="small"
              type="primary"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </van-button>
          </template>
        </van-field>
      </van-cell-group>

      <div class="login-actions">
        <van-button
          type="primary"
          block
          round
          :loading="authStore.loading"
          @click="handleLogin"
        >
          登录
        </van-button>
        <div class="agreement">
          <span class="text">登录即同意</span>
          <router-link to="/terms" class="link">《用户服务协议》</router-link>
          <span class="text">和</span>
          <router-link to="/privacy" class="link">《隐私政策》</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: $color-bg-page;
  padding: 60px $spacing-xl;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: 8px;
}

.subtitle {
  font-size: $font-size-sm;
  color: $color-text-placeholder;
}

.form-card {
  background: $color-bg-card;
  border-radius: $radius-2xl;
  padding: $spacing-xl 0;
  box-shadow: $shadow-md;
}

.login-actions {
  padding: 24px $spacing-xl 0;
}

.agreement {
  text-align: center;
  margin-top: 16px;
}

.text {
  font-size: $font-size-xs;
  color: $color-text-placeholder;
}

.link {
  font-size: $font-size-xs;
  color: $color-primary;
}
</style>
