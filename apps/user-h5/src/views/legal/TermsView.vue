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
      <span class="navbar-title">用户服务协议</span>
    </div>

    <div class="content">
      <h2>云深飞运用户服务协议</h2>
      <p class="update-date">更新日期：2026年6月</p>

      <h3>一、服务内容</h3>
      <p>云深飞运平台（以下简称"本平台"）为用户提供无人机吊运服务的在线撮合平台。用户通过本平台发布吊运需求，由平台匹配合适的飞手完成吊运任务。</p>

      <h3>二、用户注册</h3>
      <p>用户须使用本人手机号注册账号，并确保提供的信息真实、准确。用户应妥善保管账号密码，因账号保管不善造成的损失由用户自行承担。</p>

      <h3>三、服务使用</h3>
      <p>用户在使用本平台服务时，应遵守以下规范：</p>
      <ul>
        <li>发布的吊运需求信息应真实、合法</li>
        <li>不得发布违禁物品的吊运需求</li>
        <li>应按约定时间配合飞手完成取货和收货</li>
        <li>不得恶意取消订单或恶意投诉</li>
      </ul>

      <h3>四、费用与支付</h3>
      <p>本平台采用动态定价机制，费用根据距离、重量、海拔、时效等因素综合计算。用户应在下单前确认费用，并在服务完成后及时支付。</p>

      <h3>五、免责声明</h3>
      <p>因不可抗力（如恶劣天气、空域管制等）导致服务无法完成的，平台不承担违约责任。因用户提供的信息不实导致的损失，由用户自行承担。</p>

      <h3>六、隐私保护</h3>
      <p>本平台将严格保护用户的个人信息安全，详见《隐私政策》。</p>

      <h3>七、协议修改</h3>
      <p>本平台有权根据业务发展需要修改本协议，修改后的协议将在平台上公布。用户继续使用本服务即视为同意修改后的协议。</p>
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
