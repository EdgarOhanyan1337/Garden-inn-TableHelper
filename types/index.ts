// ============================================================
// TypeScript interfaces that mirror the Supabase database schema
// ============================================================

export interface Booking {
  id: string
  room_number: string
  client_name: string
  platform: string
  check_in: string          // ISO 8601 timestamp string
  check_out: string         // ISO 8601 timestamp string
  rate_per_night: number
  prepayment_amount: number
  prepayment_method: 'cash' | 'card' | 'none'
  final_payment_method: 'cash' | 'card'
  created_at: string
}

export interface AdditionalService {
  id: string
  booking_id: string
  service_name: string
  amount: number
  payment_method: 'cash' | 'card'
  date_added: string        // ISO 8601 timestamp string
}

/** Booking row enriched with its associated services — used in the Dashboard */
export interface BookingWithServices extends Booking {
  additional_services: AdditionalService[]
  /** Computed: number of nights between check_in and check_out */
  nights: number
  /** Computed: rate_per_night × nights */
  room_cost: number
  /** Computed: sum of all additional_services amounts */
  extras_total: number
  /** Computed: room_cost + extras_total */
  total_revenue: number
  /** True when the current time is past check_out */
  is_checked_out: boolean
}

/** Form state for the New Booking form */
export interface BookingFormData {
  room_number: string
  client_name: string
  platform: string
  check_in: string
  check_out: string
  rate_per_night: string
  has_prepayment: boolean
  prepayment_amount: string
  prepayment_method: 'cash' | 'card' | 'none'
  final_payment_method: 'cash' | 'card'
}

/** Form state for the Add Service form */
export interface ServiceFormData {
  booking_id: string
  service_name: string
  amount: string
  payment_method: 'cash' | 'card'
}

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}
