import type { CreateOrderParams, Order, OrderStatus, PriceEstimate } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ordersApi } from '@/api/orders'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const loading = ref(false)
  const creating = ref(false)
  const priceEstimate = ref<PriceEstimate | null>(null)
  const currentFilter = ref<OrderStatus | undefined>(undefined)

  /**
   * 加载当前用户的订单列表
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
   * 创建订单
   */
  async function createOrder(params: CreateOrderParams): Promise<{ data: Order | null, error?: string }> {
    creating.value = true
    try {
      const result = await ordersApi.create(params)
      if (!result.error && result.data) {
        orders.value.unshift(result.data)
      }
      return result
    }
    finally {
      creating.value = false
    }
  }

  /**
   * 取消订单
   */
  async function cancelOrder(id: string): Promise<{ error?: string }> {
    const result = await ordersApi.cancel(id)
    if (!result.error) {
      const order = orders.value.find(o => o.id === id)
      if (order) {
        order.status = 'cancelled'
      }
      if (currentOrder.value?.id === id) {
        currentOrder.value.status = 'cancelled'
      }
    }
    return result
  }

  /**
   * 估算价格
   */
  async function estimatePrice(params: {
    goods_weight: number
    altitude: number
    elevation_diff: number
    urgency: string
  }) {
    const { data } = await ordersApi.estimatePrice(params)
    priceEstimate.value = data
    return data
  }

  return {
    orders,
    currentOrder,
    loading,
    creating,
    priceEstimate,
    currentFilter,
    fetchOrders,
    fetchOrderDetail,
    createOrder,
    cancelOrder,
    estimatePrice,
  }
})
