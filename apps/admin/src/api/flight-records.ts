import { supabase } from './supabase'

export interface FlightRecord {
  id: string
  order_id: string
  file_url: string
  file_format: string
  parsed_data: any
  deviation_max_meters: number | null
  is_compliant: boolean | null
  anomalies: any
  review_result: string | null
  review_comment: string | null
  uploaded_at: string
  reviewed_at: string | null
  orders?: { order_no: string; goods_type: string }
}

/** 飞行记录列表 */
export async function listFlightRecords(params?: { page?: number }) {
  const page = params?.page || 1
  const pageSize = 20

  const { data, error, count } = await supabase
    .from('flight_records')
    .select('*, orders!inner(order_no, goods_type)', { count: 'exact' })
    .order('uploaded_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) throw error
  return { data: data as FlightRecord[], total: count || 0 }
}

/** 审核飞行记录 */
export async function updateFlightReview(
  recordId: string,
  result: 'approved' | 'rejected',
  comment?: string
) {
  const { error } = await supabase
    .from('flight_records')
    .update({
      review_result: result,
      review_comment: comment || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', recordId)
  if (error) throw error
}
