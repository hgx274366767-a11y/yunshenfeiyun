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
      <p class="update-time">更新日期：2026年6月1日</p>

      <section>
        <h3>一、服务内容</h3>
        <p>云深飞运平台为用户提供无人机吊运服务的信息撮合与交易服务。用户通过本平台可以发布吊运需求、查看服务报价、完成交易支付。</p>
      </section>

      <section>
        <h3>二、用户注册</h3>
        <p>用户需提供真实、准确的个人信息进行注册。平台有权对用户身份进行审核，对于信息不实的用户，平台有权拒绝提供服务。</p>
      </section>

      <section>
        <h3>三、服务规则</h3>
        <p>用户在使用平台服务时，应遵守国家法律法规及本协议的规定，不得利用平台从事违法违规活动。</p>
      </section>

      <section>
        <h3>四、费用与支付</h3>
        <p>平台服务费用以页面展示为准。用户应按照约定及时完成支付，逾期未支付的，平台有权暂停或终止服务。</p>
      </section>

      <section>
        <h3>五、免责声明</h3>
        <p>因不可抗力导致的服务中断或终止，平台不承担责任。平台不对因用户自身原因导致的损失承担责任。</p>
      </section>

      <section>
        <h3>六、协议修改</h3>
        <p>平台有权根据需要修改本协议，修改后的协议将在平台上公布。继续使用平台服务即视为接受修改后的协议。</p>
      </section>

      <section>
        <h3>七、联系我们</h3>
        <p>如对本协议有任何疑问，请联系客服邮箱：support@yunshenfeiyun.com</p>
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
