'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BookingFormData } from '@/types'
import { useToast, Toast } from '@/components/Toast'

const INITIAL_FORM: BookingFormData = {
  room_number: '',
  client_name: '',
  platform: '',
  check_in: '',
  check_out: '',
  rate_per_night: '',
  has_prepayment: false,
  prepayment_amount: '',
  prepayment_method: 'none',
  final_payment_method: 'cash',
}

export default function BookingForm() {
  const [form, setForm] = useState<BookingFormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const { toasts, addToast, dismissToast } = useToast()

  const set = (field: keyof BookingFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const computeNights = (): number => {
    if (!form.check_in || !form.check_out) return 0
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const computeRoomCost = (): number => {
    const rate = parseFloat(form.rate_per_night) || 0
    return rate * computeNights()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!form.room_number.trim()) return addToast('Room number is required.', 'error')
    if (!form.client_name.trim()) return addToast('Client name is required.', 'error')
    if (!form.platform.trim()) return addToast('Platform is required.', 'error')
    if (!form.check_in) return addToast('Check-in date is required.', 'error')
    if (!form.check_out) return addToast('Check-out date is required.', 'error')
    if (new Date(form.check_out) <= new Date(form.check_in))
      return addToast('Check-out must be after check-in.', 'error')
    if (!form.rate_per_night || parseFloat(form.rate_per_night) <= 0)
      return addToast('Rate per night must be greater than 0.', 'error')
    if (form.has_prepayment && (!form.prepayment_amount || parseFloat(form.prepayment_amount) <= 0))
      return addToast('Please enter a valid prepayment amount.', 'error')
    if (form.has_prepayment && form.prepayment_method === 'none')
      return addToast('Please select a prepayment method.', 'error')

    setLoading(true)
    try {
      const payload = {
        room_number: form.room_number.trim(),
        client_name: form.client_name.trim(),
        platform: form.platform.trim(),
        check_in: form.check_in,
        check_out: form.check_out,
        rate_per_night: parseFloat(form.rate_per_night),
        prepayment_amount: form.has_prepayment ? parseFloat(form.prepayment_amount) : 0,
        prepayment_method: form.has_prepayment ? form.prepayment_method : 'none',
        final_payment_method: form.final_payment_method,
      }

      const { error } = await supabase.from('bookings').insert(payload)

      if (error) throw error

      addToast(`Booking for ${form.client_name} (Room ${form.room_number}) created!`, 'success')
      setForm(INITIAL_FORM)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const nights = computeNights()
  const roomCost = computeRoomCost()
  const prepayAmt = parseFloat(form.prepayment_amount) || 0

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="animate-fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100">New Booking</h2>
          <p className="text-sm text-slate-500 mt-1">Register a new guest reservation</p>
        </div>

        <form id="new-booking-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left column ── */}
          <div className="space-y-5">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-400 text-xs flex items-center justify-center font-bold">1</span>
                Guest Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="room_number" className="label">Room Number</label>
                  <input
                    id="room_number"
                    type="text"
                    className="input"
                    placeholder="e.g. n14, 201, Deluxe-A"
                    value={form.room_number}
                    onChange={(e) => set('room_number', e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="client_name" className="label">Client Name</label>
                  <input
                    id="client_name"
                    type="text"
                    className="input"
                    placeholder="Full name"
                    value={form.client_name}
                    onChange={(e) => set('client_name', e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="platform" className="label">Booking Platform</label>
                  <input
                    id="platform"
                    type="text"
                    className="input"
                    placeholder="e.g. Booking.com, Walk-in, Airbnb…"
                    value={form.platform}
                    onChange={(e) => set('platform', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-400 text-xs flex items-center justify-center font-bold">2</span>
                Stay Dates
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="check_in" className="label">Check-In</label>
                  <input
                    id="check_in"
                    type="datetime-local"
                    className="input"
                    value={form.check_in}
                    onChange={(e) => set('check_in', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="check_out" className="label">Check-Out</label>
                  <input
                    id="check_out"
                    type="datetime-local"
                    className="input"
                    value={form.check_out}
                    onChange={(e) => set('check_out', e.target.value)}
                  />
                </div>
              </div>

              {nights > 0 && (
                <div className="mt-3 px-3 py-2 bg-sky-900/20 border border-sky-700/30 rounded-lg">
                  <p className="text-xs text-sky-400">
                    <span className="font-semibold">{nights}</span> night{nights !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-400 text-xs flex items-center justify-center font-bold">3</span>
                Financials
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="rate_per_night" className="label">Rate per Night (֏)</label>
                  <input
                    id="rate_per_night"
                    type="number"
                    min="0"
                    step="500"
                    className="input"
                    placeholder="0"
                    value={form.rate_per_night}
                    onChange={(e) => set('rate_per_night', e.target.value)}
                  />
                </div>

                {/* Prepayment toggle */}
                <div>
                  <label className="label">Prepayment</label>
                  <div className="flex gap-3">
                    {(['yes', 'no'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        id={`prepayment-${opt}`}
                        onClick={() => set('has_prepayment', opt === 'yes')}
                        className={`
                          flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200
                          ${(form.has_prepayment ? 'yes' : 'no') === opt
                            ? 'bg-sky-600/30 text-sky-300 border-sky-600/50'
                            : 'bg-[#0f172a] text-slate-400 border-[#334155] hover:border-[#475569]'
                          }
                        `}
                      >
                        {opt === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.has_prepayment && (
                  <div className="space-y-3 pl-3 border-l-2 border-sky-700/40 animate-fade-in">
                    <div>
                      <label htmlFor="prepayment_amount" className="label">Prepayment Amount (֏)</label>
                      <input
                        id="prepayment_amount"
                        type="number"
                        min="0"
                        step="500"
                        className="input"
                        placeholder="0"
                        value={form.prepayment_amount}
                        onChange={(e) => set('prepayment_amount', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="label">Prepayment Method</label>
                      <div className="flex gap-3">
                        {(['cash', 'card'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            id={`prepay-method-${m}`}
                            onClick={() => set('prepayment_method', m)}
                            className={`
                              flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200
                              ${form.prepayment_method === m
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
                  </div>
                )}

                <div>
                  <label className="label">Final Payment Method</label>
                  <div className="flex gap-3">
                    {(['cash', 'card'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        id={`final-method-${m}`}
                        onClick={() => set('final_payment_method', m)}
                        className={`
                          flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200
                          ${form.final_payment_method === m
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
              </div>
            </div>

            {/* Summary */}
            {nights > 0 && parseFloat(form.rate_per_night) > 0 && (
              <div className="card border-sky-700/30 bg-sky-900/10 animate-fade-in">
                <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-3">Cost Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Room ({nights} nights × ֏{parseFloat(form.rate_per_night || '0').toLocaleString()})</span>
                    <span className="text-slate-200 font-medium">֏{roomCost.toLocaleString()}</span>
                  </div>
                  {form.has_prepayment && prepayAmt > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Prepayment ({form.prepayment_method})</span>
                      <span className="text-amber-400 font-medium">− ֏{prepayAmt.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-slate-100 border-t border-[#334155] pt-2 mt-2">
                    <span>Balance Due</span>
                    <span className="text-sky-400">֏{(roomCost - prepayAmt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              id="submit-booking"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                '＋ Create Booking'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
