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
    <!-- Hero 区域 -->
    <div class="login-hero">
      <div class="login-hero-bg"></div>
      <div class="login-hero-content">
        <div class="login-logo">
          <img src="@/assets/logo2.png" alt="云深飞运Logo" />
        </div>
        <div class="login-brand-en">CloudAero</div>
        <div class="login-brand-cn">云深飞运</div>
        <div class="login-slogan">低空领域的货拉拉</div>
      </div>
    </div>

    <!-- 登录表单卡片 -->
    <div class="login-card">
      <h2 class="login-title">手机号登录</h2>

      <div class="input-group">
        <label class="input-label">手机号</label>
        <div class="input-wrap">
          <van-icon name="phone-o" size="18" />
          <input
            v-model="phone"
            type="tel"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">验证码</label>
        <div class="input-wrap">
          <van-icon name="shield-o" size="18" />
          <input
            v-model="code"
            type="text"
            placeholder="请输入验证码"
            maxlength="6"
          />
          <button
            class="send-code-btn"
            :disabled="countdown > 0"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </button>
        </div>
      </div>

      <button class="login-btn" @click="handleLogin">
        <van-icon name="arrow" />
        登录 / 注册
      </button>

      <div class="login-agreement">
        登录即同意
        <router-link to="/terms">《用户协议》</router-link>
        和
        <router-link to="/privacy">《隐私政策》</router-link>
      </div>
    </div>

    <!-- 底部版权 -->
    <div class="login-footer">
      <div class="login-footer-brand">云深飞运</div>
      <div class="login-footer-copy">© 2026 云深织梦（重庆）科技有限公司</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: $color-bg-page;
}

// Hero 区域
.login-hero {
  position: relative;
  overflow: hidden;
  padding: 16px 16px 0;

  .login-hero-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(150deg, #060F2E 0%, #0F2460 40%, $color-primary 80%, $color-primary-dark 100%);
    z-index: 0;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80') center/cover;
      opacity: 0.15;
    }
  }

  .login-hero-content {
    position: relative;
    z-index: 10;
    text-align: center;
    padding: 60px 0 40px;
  }
}

.login-logo {
  width: 140px;
  height: 140px;
  margin: 0 auto 20px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  animation: float 4s ease-in-out infinite;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.login-brand-en {
  font-size: 26px;
  font-weight: 800;
  color: white;
  letter-spacing: 2px;
}

.login-brand-cn {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin-top: 2px;
}

.login-slogan {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
  letter-spacing: 2px;
}

// 登录表单卡片
.login-card {
  margin: -28px 16px 24px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(20px);
  border-radius: $radius-xl;
  padding: 28px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 20;
}

.login-title {
  font-size: 20px;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 24px;
}

.input-group {
  margin-bottom: 16px;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: $color-text-secondary;
  margin-bottom: 8px;
  display: block;
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  background: $color-bg-input;
  border-radius: $radius-sm;
  padding: 14px 16px;
  border: 1.5px solid $color-border-light;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: $color-primary;
    background: white;
  }

  i {
    color: $color-text-placeholder;
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: $color-text-primary;

    &::placeholder {
      color: $color-text-placeholder;
    }
  }
}

.send-code-btn {
  background: $color-primary;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  z-index: 1;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.login-btn {
  width: 100%;
  padding: 16px;
  text-align: center;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-md;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  box-shadow: $shadow-btn;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  border: none;

  &:active {
    transform: scale(0.98);
  }
}

.login-agreement {
  text-align: center;
  font-size: 12px;
  color: $color-text-placeholder;
  margin-top: 16px;

  a {
    color: $color-primary;
    text-decoration: underline;
  }
}

.login-footer {
  text-align: center;
  padding: 20px 16px 40px;
}

.login-footer-brand {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

.login-footer-copy {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.2);
  margin-top: 4px;
}
</style>
