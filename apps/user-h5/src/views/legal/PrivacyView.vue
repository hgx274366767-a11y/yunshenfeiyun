<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <div class="legal-page">
    <div class="navbar">
      <van-icon name="arrow-left" class="back-icon" @click="goBack" />
      <span class="navbar-title">隐私政策</span>
    </div>

    <div class="content">
      <h2>云深飞运隐私政策</h2>
      <p class="update-date">更新日期：2026年6月</p>

      <h3>一、信息收集</h3>
      <p>为提供服务，我们可能收集以下信息：</p>
      <ul>
        <li>注册信息：手机号码</li>
        <li>订单信息：地址、货物信息、联系方式</li>
        <li>位置信息：用于匹配附近飞手和计算距离</li>
        <li>设备信息：设备型号、操作系统版本</li>
      </ul>

      <h3>二、信息使用</h3>
      <p>我们收集的信息将用于：</p>
      <ul>
        <li>提供无人机吊运撮合服务</li>
        <li>计算服务费用</li>
        <li>联系用户确认订单</li>
        <li>改善服务质量</li>
        <li>保障平台安全</li>
      </ul>

      <h3>三、信息共享</h3>
      <p>我们不会将您的个人信息出售给第三方。为完成服务，我们可能将必要的订单信息（如地址、联系方式）共享给飞手。</p>

      <h3>四、信息存储</h3>
      <p>您的个人信息存储在安全的云服务器上，采用加密传输和存储。我们仅在提供服务所必需的期限内保留您的个人信息。</p>

      <h3>五、信息安全</h3>
      <p>我们采用行业标准的安全措施保护您的个人信息，包括数据加密、访问控制、安全审计等。</p>

      <h3>六、用户权利</h3>
      <p>您有权访问、修改、删除您的个人信息。如需行使相关权利，请联系客服。</p>

      <h3>七、政策更新</h3>
      <p>本政策可能会不时更新。更新后的政策将在平台上公布，继续使用本服务即视为同意更新后的政策。</p>

      <h3>八、联系我们</h3>
      <p>如对本隐私政策有任何疑问，请联系客服。</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.legal-page {
  min-height: 100vh;
  background: $color-bg-page;
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

.content {
  padding: $spacing-xl;
  line-height: 1.8;
  color: $color-text-primary;

  h2 {
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
    margin-bottom: $spacing-md;
    text-align: center;
  }

  .update-date {
    text-align: center;
    font-size: $font-size-sm;
    color: $color-text-placeholder;
    margin-bottom: $spacing-2xl;
  }

  h3 {
    font-size: $font-size-xl;
    font-weight: $font-weight-semibold;
    margin: $spacing-xl 0 $spacing-md;
  }

  p {
    font-size: $font-size-lg;
    margin-bottom: $spacing-md;
  }

  ul {
    padding-left: $spacing-xl;
    margin-bottom: $spacing-md;

    li {
      font-size: $font-size-lg;
      margin-bottom: $spacing-sm;
      list-style: disc;
    }
  }
}
</style>
