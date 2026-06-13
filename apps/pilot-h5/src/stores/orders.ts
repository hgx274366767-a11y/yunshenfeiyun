import type { Order, OrderStatus } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ordersApi } from '@/api/orders'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const loading = ref(false)
  const currentFilter = ref<OrderStatus | undefined>(undefined)

  /**
   * 加载订单列表
   */
  async function fetchOrders(status?: OrderStatus) {
    loading.value = true
    currentFilter.value = status
    try {
      const { data, error } = await ordersApi.getList({ status })
      if (error) {
        console.error('Failed to fetch orders:', error)
        return
      }
      orders.value = data ?? []
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 加载订单详情
   */
  async function fetchOrderDetail(id: string) {
    loading.value = true
    try {
      const { data, error } = await ordersApi.getDetail(id)
      if (error) {
        console.error('Failed to fetch order detail:', error)
        return
      }
      currentOrder.value = data
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 接受订单
   */
  async function acceptOrder(id: string): Promise<{ error?: string }> {
    const result = await ordersApi.accept(id)
    if (!result.error) {
      // 更新本地状态
      const order = orders.value.find(o => o.id === id)
      if (order) {
        order.status = 'accepted'
      }
    }
    return result
  }

  /**
   * 完成订单
   */
  async function completeOrder(id: string): Promise<{ error?: string }> {
    const result = await ordersApi.complete(id)
    if (!result.error) {
      const order = orders.value.find(o => o.id === id)
      if (order) {
        order.status = 'completed'
      }
    }
    return result
  }

  return {
    orders,
    currentOrder,
    loading,
    currentFilter,
    fetchOrders,
    fetchOrderDetail,
    acceptOrder,
    completeOrder,
  }
})
