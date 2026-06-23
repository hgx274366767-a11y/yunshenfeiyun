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
  const redirect = (route.query.redirect as string) || '/orders'
  router.push(redirect)
}
</script>

<template>
  <div class="login-page">
    <!-- 状态栏 -->
    <div class="status-bar">
      <span>9:41</span>
      <div class="status-icons">
        <van-icon name="signal" size="12" />
        <van-icon name="wifi" size="12" />
        <van-icon name="volume" size="12" />
      </div>
    </div>

    <!-- Hero区域 -->
    <div class="login-hero">
      <div class="login-logo">
        <img src="@/assets/logo2.png" alt="云深飞运Logo" />
      </div>
      <div class="login-brand">
        <h2><span class="brand-en">CloudAero</span>云深飞运</h2>
        <p>PILOT · 接单工作台</p>
      </div>
    </div>

    <!-- 登录表单 -->
    <div class="login-card">
      <h3 class="login-title">飞手登录</h3>
      
      <div class="login-field">
        <label>手机号</label>
        <div class="login-input">
          <van-icon name="mobile-o" size="18" color="#94A3B8" />
          <input 
            v-model="phone" 
            type="tel" 
            placeholder="请输入手机号" 
            maxlength="11"
          />
        </div>
      </div>

      <div class="login-field">
        <label>验证码</label>
        <div class="login-input">
          <van-icon name="shield-o" size="18" color="#94A3B8" />
          <input 
            v-model="code" 
            type="text" 
            placeholder="请输入验证码" 
            maxlength="6"
          />
          <button 
            class="sms-btn" 
            :disabled="countdown > 0"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </button>
        </div>
      </div>

      <button 
        class="login-btn" 
        :disabled="authStore.loading"
        @click="handleLogin"
      >
        <van-icon name="arrow-right" v-if="!authStore.loading" />
        <van-loading v-else size="20" color="white" />
        {{ authStore.loading ? '登录中...' : '登录 / 注册' }}
      </button>

      <div class="login-footer">
        登录即同意 
        <router-link to="/terms">《用户协议》</router-link> 
        和 
        <router-link to="/privacy">《隐私政策》</router-link>
      </div>
    </div>

    <div class="login-copyright">
      © 2026 云深织梦（重庆）科技有限公司
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #060F2E 0%, #0F2460 40%, #1D4ED8 80%, #1E40AF 100%);
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 50%);
  animation: pulse 8s ease-in-out infinite;
}

.status-bar {
  position: relative;
  z-index: 10;
  height: 48px;
  padding: 14px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.status-icons {
  display: flex;
  gap: 6px;
  font-size: 13px;
}

.login-hero {
  position: relative;
  z-index: 10;
  height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.login-logo {
  width: 140px;
  height: 140px;
  border-radius: 32px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: float 4s ease-in-out infinite;
  overflow: hidden;
}

.login-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.login-brand {
  text-align: center;
  color: white;
}

.brand-en {
  font-style: italic;
  font-weight: 800;
  letter-spacing: 1px;
}

.login-brand h2 {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 3px;
}

.login-brand p {
  font-size: 14px;
  opacity: 0.6;
  margin-top: 8px;
  letter-spacing: 2px;
}

.login-card {
  position: relative;
  z-index: 20;
  margin: -28px 24px 24px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(24px);
  border-radius: 24px;
  padding: 32px 28px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.3);
}

.login-title {
  font-size: 20px;
  font-weight: 700;
  color: #0F172A;
  margin-bottom: 24px;
}

.login-field {
  margin-bottom: 18px;

  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #64748B;
    margin-bottom: 8px;
  }
}

.login-input {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 16px 18px;
  border: 2px solid transparent;
  transition: all 0.3s;

  &:focus-within {
    border-color: #1D4ED8;
    background: white;
    box-shadow: 0 0 0 4px rgba(29,78,216,0.1);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15px;
    color: #0F172A;

    &::placeholder {
      color: #94A3B8;
    }
  }
}

.sms-btn {
  background: #1D4ED8;
  color: white;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #1E40AF;
  }

  &:disabled {
    background: #94A3B8;
    cursor: not-allowed;
  }
}

.login-btn {
  width: 100%;
  padding: 18px;
  text-align: center;
  background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(29,78,216,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
  transition: all 0.3s;
  border: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(29,78,216,0.5);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
}

.login-footer {
  text-align: center;
  font-size: 12px;
  color: #94A3B8;
  margin-top: 20px;

  a {
    color: #1D4ED8;
    text-decoration: underline;
  }
}

.login-copyright {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 40px 20px;
  color: rgba(255,255,255,0.3);
  font-size: 11px;
}
</style>
