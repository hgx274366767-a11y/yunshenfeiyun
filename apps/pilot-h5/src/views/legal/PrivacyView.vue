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
      <p class="update-time">更新日期：2026年6月1日</p>

      <section>
        <h3>一、信息收集</h3>
        <p>我们收集以下信息以提供服务：手机号码（用于身份验证）、位置信息（用于路线规划和导航）、订单信息（用于完成交易）。</p>
      </section>

      <section>
        <h3>二、信息使用</h3>
        <p>我们收集的信息仅用于：提供和改进服务、身份验证、安全保障、法律合规。我们不会将您的个人信息用于本政策未载明的其他用途。</p>
      </section>

      <section>
        <h3>三、信息共享</h3>
        <p>我们不会向第三方出售您的个人信息。在以下情况下，我们可能会共享您的信息：经您同意、法律法规要求、为保护平台和用户的合法权益。</p>
      </section>

      <section>
        <h3>四、信息保护</h3>
        <p>我们采用业界标准的安全技术措施保护您的个人信息，包括数据加密、访问控制、安全审计等措施，防止信息遭到未经授权的访问、披露、篡改或丢失。</p>
      </section>

      <section>
        <h3>五、您的权利</h3>
        <p>您有权访问、更正、删除您的个人信息。您可以通过账户设置或联系客服行使上述权利。</p>
      </section>

      <section>
        <h3>六、未成年人保护</h3>
        <p>我们非常重视未成年人个人信息的保护。如您为未满18周岁的未成年人，请在法定监护人的陪同下阅读本政策。</p>
      </section>

      <section>
        <h3>七、联系我们</h3>
        <p>如对本政策有任何疑问，请联系客服邮箱：privacy@yunshenfeiyun.com</p>
      </section>
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
    font-size: $font-size-2xl;
    margin-bottom: 8px;
  }

  .update-time {
    font-size: $font-size-xs;
    color: $color-text-placeholder;
    margin-bottom: $spacing-xl;
  }

  h3 {
    font-size: $font-size-lg;
    margin: 24px 0 12px;
  }

  p {
    font-size: $font-size-md;
    margin-bottom: 12px;
  }
}
</style>
