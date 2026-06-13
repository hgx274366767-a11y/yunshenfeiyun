import type { CreditLevel, GrabbableOrder, PilotInfo, TaskInfo } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ordersApi } from '@/api/orders'

export const usePilotStore = defineStore('pilot', () => {
  // ========== 飞手信息 ==========
  const pilot = ref<PilotInfo | null>(null)
  const loading = ref(false)

  // ========== 可抢订单 ==========
  const grabbableOrders = ref<GrabbableOrder[]>([])
  const ordersLoading = ref(false)

  // ========== 当前任务 ==========
  const currentTask = ref<TaskInfo | null>(null)
  const taskLoading = ref(false)

  // ========== 计算属性 ==========
  const isLoggedIn = computed(() => !!pilot.value)

  const creditLevel = computed<CreditLevel>(() => {
    if (!pilot.value)
      return 'probation'
    if (pilot.value.credit_score >= 80)
      return 'gold'
    if (pilot.value.credit_score >= 60)
      return 'senior'
    return 'probation'
  })

  const onlineStatus = computed(() => pilot.value?.online_status ?? false)

  // ========== 操作 ==========

  /** 加载飞手信息 */
  async function fetchPilotInfo() {
    loading.value = true
    try {
      const { data, error } = await ordersApi.getPilotStats()
      if (!error && data) {
        pilot.value = data as PilotInfo
      }
    }
    finally {
      loading.value = false
    }
  }

  /** 切换在线状态 */
  async function toggleOnlineStatus(): Promise<boolean> {
    if (!pilot.value)
      return false
    const newStatus = !pilot.value.online_status
    const error = await ordersApi.setOnlineStatus(newStatus)
    if (!error) {
      pilot.value.online_status = newStatus
      return true
    }
    return false
  }

  /** 加载可抢订单列表 */
  async function fetchGrabbableOrders() {
    ordersLoading.value = true
    try {
      const { data, error } = await ordersApi.getGrabbableList()
      if (!error) {
        grabbableOrders.value = data
      }
    }
    finally {
      ordersLoading.value = false
    }
  }

  /** 抢单 */
  async function grabOrder(orderId: string): Promise<{ success: boolean, error?: string }> {
    const result = await ordersApi.grabOrder(orderId)
    if (!result.error) {
      // 从可抢列表中移除
      grabbableOrders.value = grabbableOrders.value.filter(o => o.id !== orderId)
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  /** 加载当前任务 */
  async function fetchCurrentTask() {
    taskLoading.value = true
    try {
      const { data, error } = await ordersApi.getCurrentTask()
      if (!error) {
        currentTask.value = data
      }
      else {
        currentTask.value = null
      }
    }
    finally {
      taskLoading.value = false
    }
  }

  /** 更新任务步骤 */
  async function updateTaskStep(step: string): Promise<{ success: boolean, error?: string }> {
    if (!currentTask.value)
      return { success: false, error: '无当前任务' }
    const result = await ordersApi.updateTaskStep(currentTask.value.order_id, step)
    if (!result.error) {
      currentTask.value.current_step = step
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  /** 判断飞手是否有权限抢单 */
  function canGrab(order: GrabbableOrder): boolean {
    const now = Date.now()
    const eligibleAfter = new Date(order.grab_eligible_after).getTime()
    if (now < eligibleAfter)
      return false

    const level = order.current_eligible_level
    if (level === 'gold')
      return creditLevel.value === 'gold'
    if (level === 'senior')
      return ['gold', 'senior'].includes(creditLevel.value)
    if (level === 'all') {
      if (['gold', 'senior'].includes(creditLevel.value))
        return true
      return order.is_basic_order
    }
    return false
  }

  return {
    pilot,
    loading,
    grabbableOrders,
    ordersLoading,
    currentTask,
    taskLoading,
    isLoggedIn,
    creditLevel,
    onlineStatus,
    fetchPilotInfo,
    toggleOnlineStatus,
    fetchGrabbableOrders,
    grabOrder,
    fetchCurrentTask,
    updateTaskStep,
    canGrab,
  }
})
