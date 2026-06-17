'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Booking, ServiceFormData } from '@/types'
import { useToast, Toast } from '@/components/Toast'

const QUICK_SERVICES = ['Breakfast', 'Lunch', 'Dinner', 'Laundry', 'Transfer', 'Minibar', 'Parking', 'Spa']

const INITIAL_FORM: ServiceFormData = {
  booking_id: '',
  service_name: '',
  amount: '',
  payment_method: 'cash',
}

export default function ServiceForm() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [form, setForm] = useState<ServiceFormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const { toasts, addToast, dismissToast } = useToast()

  const fetchActiveBookings = useCallback(async () => {
    setFetching(true)
    try {
      const now = new Date().toISOString()
      // Fetch all bookings that haven't checked out yet, plus recently checked in ones
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('check_out', new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()) // within last 24h
        .order('check_in', { ascending: false })
        .limit(100)

      if (error) throw error
      setBookings(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings.'
      addToast(msg, 'error')
    } finally {
      setFetching(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchActiveBookings()
  }, [fetchActiveBookings])

  const set = (field: keyof ServiceFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const filteredBookings = bookings.filter((b) => {
    const q = search.toLowerCase()
    return (
      b.room_number.toLowerCase().includes(q) ||
      b.client_name.toLowerCase().includes(q) ||
      b.platform.toLowerCase().includes(q)
    )
  })

  const selectedBooking = bookings.find((b) => b.id === form.booking_id) ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.booking_id) return addToast('Please select a booking.', 'error')
    if (!form.service_name.trim()) return addToast('Service name is required.', 'error')
    if (!form.amount || parseFloat(form.amount) <= 0)
      return addToast('Amount must be greater than 0.', 'error')

    setLoading(true)
    try {
      const { error } = await supabase.from('additional_services').insert({
        booking_id: form.booking_id,
        service_name: form.service_name.trim(),
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
      })

      if (error) throw error

      const guestName = selectedBooking?.client_name ?? 'Guest'
      addToast(
        `${form.service_name} (֏${parseFloat(form.amount).toLocaleString()}) added to ${guestName}'s booking.`,
        'success'
      )
      setForm((prev) => ({ ...prev, service_name: '', amount: '' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add service.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const isCheckedOut = (b: Booking) => new Date(b.check_out) < new Date()

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="animate-fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100">Add Service</h2>
          <p className="text-sm text-slate-500 mt-1">
            Append an extra charge to an existing booking — recorded as an independent ledger entry
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left: Booking selection ── */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-400 text-xs flex items-center justify-center font-bold">1</span>
              Select Booking
            </h3>

            <div className="relative">
              <input
                id="booking-search"
                type="text"
                className="input pl-9"
                placeholder="Search by room, name, platform…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {fetching ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl skeleton" />
                ))
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-sm">
                  No active bookings found
                </div>
              ) : (
                filteredBookings.map((b) => {
                  const checkedOut = isCheckedOut(b)
                  const isSelected = form.booking_id === b.id
                  return (
                    <button
                      key={b.id}
                      id={`select-booking-${b.id}`}
                      type="button"
                      onClick={() => set('booking_id', b.id)}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl border transition-all duration-200
                        ${isSelected
                          ? 'bg-sky-900/30 border-sky-600/50'
                          : 'bg-[#0f172a] border-[#334155] hover:border-[#475569]'
                        }
                        ${checkedOut ? 'opacity-60' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            Room {b.room_number} — {b.client_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(b.check_in).toLocaleDateString()} →{' '}
                            {new Date(b.check_out).toLocaleDateString()} · {b.platform}
                          </p>
                        </div>
                        {checkedOut ? (
                          <span className="badge-checked-out">Checked Out</span>
                        ) : (
                          <span className="badge-active">Active</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <button
              type="button"
              onClick={fetchActiveBookings}
              className="btn-secondary w-full text-xs py-2"
            >
              ↺ Refresh List
            </button>
          </div>

          {/* ── Right: Service details ── */}
          <div>
            <form id="add-service-form" onSubmit={handleSubmit} className="card space-y-5">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-400 text-xs flex items-center justify-center font-bold">2</span>
                Service Details
              </h3>

              {selectedBooking && (
                <div className="px-3 py-2.5 bg-sky-900/20 border border-sky-700/30 rounded-lg animate-fade-in">
                  <p className="text-xs text-sky-400 font-semibold">Adding to:</p>
                  <p className="text-sm text-slate-200 mt-0.5">
                    Room {selectedBooking.room_number} — {selectedBooking.client_name}
                  </p>
                </div>
              )}

              {/* Quick-pick service buttons */}
              <div>
                <label className="label">Quick Pick</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SERVICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      id={`quick-service-${s.toLowerCase()}`}
                      onClick={() => set('service_name', s)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200
                        ${form.service_name === s
                          ? 'bg-sky-600/30 text-sky-300 border-sky-600/50'
                          : 'bg-[#0f172a] text-slate-400 border-[#334155] hover:border-[#475569] hover:text-slate-200'
                        }
                      `}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="service_name" className="label">Service Name</label>
                <input
                  id="service_name"
                  type="text"
                  className="input"
                  placeholder="or type a custom service…"
                  value={form.service_name}
                  onChange={(e) => set('service_name', e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="service_amount" className="label">Amount (֏)</label>
                <input
                  id="service_amount"
                  type="number"
                  min="0"
                  step="100"
                  className="input"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Payment Method</label>
                <div className="flex gap-3">
                  {(['cash', 'card'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      id={`service-method-${m}`}
                      onClick={() => set('payment_method', m)}
                      className={`
                        flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200
                        ${form.payment_method === m
                          ? m === 'cash'
                            ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
                            : 'bg-violet-900/40 text-violet-300 border-violet-700/50'
                          : 'bg-[#0f172a] text-slate-400 border-[#334155] hover:border-[#475569]'
                        }
                      `}
                    >
                      {m === 'cash' ? '💵 Cash' : '💳 Card'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                id="submit-service"
                disabled={loading || !form.booking_id}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  '❖ Add Service'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
