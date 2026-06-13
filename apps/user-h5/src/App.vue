<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div id="app">
    <RouterView />
    <!-- 底部 Tabbar（仅在需要的页面显示） -->
    <van-tabbar v-if="route.meta.showTabbar" route>
      <van-tabbar-item icon="home-o" to="/">
        首页
      </van-tabbar-item>
      <van-tabbar-item icon="orders-o" to="/orders">
        订单
      </van-tabbar-item>
      <van-tabbar-item icon="user-o" to="/profile">
        我的
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style lang="scss">
#app {
  min-height: 100vh;
}
</style>
