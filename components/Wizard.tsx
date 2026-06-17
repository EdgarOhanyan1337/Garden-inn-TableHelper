'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Booking, BookingFormData } from '@/types'
import { useToast, Toast } from '@/components/Toast'

interface WizardProps {
  onComplete: () => void
}

const INITIAL_BOOKING_FORM: BookingFormData = {
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

const QUICK_SERVICES = ['Breakfast', 'Lunch', 'Dinner', 'Laundry', 'Transfer', 'Minibar', 'Parking', 'Spa']

export default function Wizard({ onComplete }: WizardProps) {
  const { toasts, addToast, dismissToast } = useToast()
  const [loading, setLoading] = useState(false)

  // ── Flow State ──
  // 'selection' | 'booking-1' | 'booking-2' | 'booking-3' | 'booking-4' | 'service-1' | 'service-2' | 'service-3'
  const [step, setStep] = useState<string>('selection')

  // ── Booking Form State ──
  const [bookingForm, setBookingForm] = useState<BookingFormData>(INITIAL_BOOKING_FORM)
  const setBForm = (field: keyof BookingFormData, value: string | boolean) =>
    setBookingForm((prev) => ({ ...prev, [field]: value }))

  // ── Service Form State ──
  const [activeBookings, setActiveBookings] = useState<Booking[]>([])
  const [fetchingBookings, setFetchingBookings] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string>('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [serviceAmount, setServiceAmount] = useState('')
  const [servicePaymentMethod, setServicePaymentMethod] = useState<'cash' | 'card'>('cash')
  const [serviceDate, setServiceDate] = useState<string>('') // custom date/time for services

  // Initialize service date to today's date-time local on mount
  useEffect(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16)
    setServiceDate(localISOTime)
  }, [])

  // Fetch active guests for service addition
  const fetchActiveGuests = useCallback(async () => {
    setFetchingBookings(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('check_out', new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()) // checked out in last 24h or active
        .order('check_in', { ascending: false })
        .limit(100)

      if (error) throw error
      setActiveBookings(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch active bookings.'
      addToast(msg, 'error')
    } finally {
      setFetchingBookings(false)
    }
  }, [addToast])

  useEffect(() => {
    if (step === 'service-1') {
      fetchActiveGuests()
    }
  }, [step, fetchActiveGuests])

  // ── Calculations ──
  const computeNights = (): number => {
    if (!bookingForm.check_in || !bookingForm.check_out) return 0
    const diff = new Date(bookingForm.check_out).getTime() - new Date(bookingForm.check_in).getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const computeRoomCost = (): number => {
    const rate = parseFloat(bookingForm.rate_per_night) || 0
    return rate * computeNights()
  }

  const nights = computeNights()
  const roomCost = computeRoomCost()
  const prepayAmt = parseFloat(bookingForm.prepayment_amount) || 0

  // ── Submissions ──
  const saveBooking = async () => {
    setLoading(true)
    try {
      const payload = {
        room_number: bookingForm.room_number.trim(),
        client_name: bookingForm.client_name.trim(),
        platform: bookingForm.platform.trim(),
        check_in: bookingForm.check_in,
        check_out: bookingForm.check_out,
        rate_per_night: parseFloat(bookingForm.rate_per_night),
        prepayment_amount: bookingForm.has_prepayment ? parseFloat(bookingForm.prepayment_amount) : 0,
        prepayment_method: bookingForm.has_prepayment ? bookingForm.prepayment_method : 'none',
        final_payment_method: bookingForm.final_payment_method,
      }

      const { error } = await supabase.from('bookings').insert(payload)
      if (error) throw error

      addToast(`Booking for ${bookingForm.client_name} created successfully!`, 'success')
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving booking.'
      addToast(msg, 'error')
      setLoading(false)
    }
  }

  const saveService = async () => {
    setLoading(true)
    try {
      const payload = {
        booking_id: selectedBookingId,
        service_name: serviceName.trim(),
        amount: parseFloat(serviceAmount),
        payment_method: servicePaymentMethod,
        date_added: serviceDate ? new Date(serviceDate).toISOString() : new Date().toISOString(),
      }

      const { error } = await supabase.from('additional_services').insert(payload)
      if (error) throw error

      const guest = activeBookings.find((b) => b.id === selectedBookingId)
      addToast(`Added service "${serviceName}" to Room ${guest?.room_number} (${guest?.client_name})`, 'success')
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding service.'
      addToast(msg, 'error')
      setLoading(false)
    }
  }

  // ── Helpers ──
  const selectedBooking = activeBookings.find((b) => b.id === selectedBookingId) ?? null

  const filteredBookings = activeBookings.filter((b) => {
    const q = serviceSearch.toLowerCase()
    return (
      b.room_number.toLowerCase().includes(q) ||
      b.client_name.toLowerCase().includes(q) ||
      b.platform.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-2xl mx-auto py-4 animate-fade-in">

        {/* ── STEP 1: Selection ── */}
        {step === 'selection' && (
          <div className="space-y-6 text-center py-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Create Entry</h2>
              <p className="text-sm text-slate-500 mt-2">
                What action would you like to perform?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                id="wizard-select-booking"
                type="button"
                onClick={() => setStep('booking-1')}
                className="card flex flex-col items-center justify-center p-8 gap-4 hover:border-sky-500 hover:bg-sky-500/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center text-2xl font-bold transition-all">
                  ＋
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-200">Register Guest</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Book a room for a new arriving guest, calculate stay costs, and log prepayments.
                  </p>
                </div>
              </button>

              <button
                id="wizard-select-service"
                type="button"
                onClick={() => setStep('service-1')}
                className="card flex flex-col items-center justify-center p-8 gap-4 hover:border-violet-500 hover:bg-violet-500/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 group-hover:bg-violet-500 group-hover:text-white flex items-center justify-center text-2xl font-bold transition-all">
                  ❖
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-200">Add Extra Service</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Append breakfast, laundry, transfer, or other services to an active guest staying with us.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PATH A: REGISTER GUEST (BOOKING)
            ══════════════════════════════════════════════════════ */}

        {/* Booking Step 1: Room & Guest Info */}
        {step === 'booking-1' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 1: Guest Details</h3>
                <p className="text-xs text-slate-500">Provide name and room number</p>
              </div>
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider bg-sky-950/50 border border-sky-800/50 px-2.5 py-1 rounded-full">
                Step 1 of 4
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="b-room" className="label">Room Number</label>
                <input
                  id="b-room"
                  type="text"
                  className="input"
                  placeholder="e.g. n14, 204, Deluxe"
                  value={bookingForm.room_number}
                  onChange={(e) => setBForm('room_number', e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="b-name" className="label">Client Name</label>
                <input
                  id="b-name"
                  type="text"
                  className="input"
                  placeholder="Guest's full name"
                  value={bookingForm.client_name}
                  onChange={(e) => setBForm('client_name', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                onClick={() => setStep('selection')}
                className="btn-secondary"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                id="booking-1-next"
                disabled={!bookingForm.room_number.trim() || !bookingForm.client_name.trim()}
                onClick={() => setStep('booking-2')}
                className="btn-primary"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Booking Step 2: Stay Details */}
        {step === 'booking-2' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 2: Stay Details</h3>
                <p className="text-xs text-slate-500">Dates of stay and source platform</p>
              </div>
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider bg-sky-950/50 border border-sky-800/50 px-2.5 py-1 rounded-full">
                Step 2 of 4
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="b-platform" className="label">Booking Platform</label>
                <input
                  id="b-platform"
                  type="text"
                  className="input"
                  placeholder="e.g. Booking.com, Airbnb, Walk-in"
                  value={bookingForm.platform}
                  onChange={(e) => setBForm('platform', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="b-in" className="label">Check-In Date & Time</label>
                  <input
                    id="b-in"
                    type="datetime-local"
                    className="input"
                    value={bookingForm.check_in}
                    onChange={(e) => setBForm('check_in', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="b-out" className="label">Check-Out Date & Time</label>
                  <input
                    id="b-out"
                    type="datetime-local"
                    className="input"
                    value={bookingForm.check_out}
                    onChange={(e) => setBForm('check_out', e.target.value)}
                  />
                </div>
              </div>

              {nights > 0 && (
                <div className="px-3 py-2 bg-sky-900/20 border border-sky-700/30 rounded-lg text-xs text-sky-400 font-semibold">
                  ✓ stay length: {nights} night{nights !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                onClick={() => setStep('booking-1')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="button"
                id="booking-2-next"
                disabled={!bookingForm.platform.trim() || !bookingForm.check_in || !bookingForm.check_out || nights <= 0}
                onClick={() => setStep('booking-3')}
                className="btn-primary"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Booking Step 3: Financials */}
        {step === 'booking-3' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 3: Room Cost & Payments</h3>
                <p className="text-xs text-slate-500">Configure base price, prepayment, and method</p>
              </div>
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider bg-sky-950/50 border border-sky-800/50 px-2.5 py-1 rounded-full">
                Step 3 of 4
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="b-rate" className="label">Rate per Night (֏)</label>
                <input
                  id="b-rate"
                  type="number"
                  min="0"
                  step="500"
                  className="input"
                  placeholder="0"
                  value={bookingForm.rate_per_night}
                  onChange={(e) => setBForm('rate_per_night', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Has Prepayment?</label>
                <div className="flex gap-3">
                  {(['yes', 'no'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      id={`b-has-prepay-${opt}`}
                      onClick={() => {
                        setBForm('has_prepayment', opt === 'yes')
                        if (opt === 'no') {
                          setBForm('prepayment_amount', '')
                          setBForm('prepayment_method', 'none')
                        }
                      }}
                      className={`
                        flex-1 py-2 rounded-lg text-sm font-semibold border transition-all duration-200
                        ${(bookingForm.has_prepayment ? 'yes' : 'no') === opt
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

              {bookingForm.has_prepayment && (
                <div className="space-y-3 pl-3 border-l-2 border-sky-700/40 animate-fade-in">
                  <div>
                    <label htmlFor="b-prepay-amt" className="label">Prepayment Amount (֏)</label>
                    <input
                      id="b-prepay-amt"
                      type="number"
                      min="0"
                      step="500"
                      className="input"
                      placeholder="0"
                      value={bookingForm.prepayment_amount}
                      onChange={(e) => setBForm('prepayment_amount', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Prepayment Method</label>
                    <div className="flex gap-3">
                      {(['cash', 'card'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          id={`b-prepay-method-${m}`}
                          onClick={() => setBForm('prepayment_method', m)}
                          className={`
                            flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200
                            ${bookingForm.prepayment_method === m
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
                      id={`b-final-method-${m}`}
                      onClick={() => setBForm('final_payment_method', m)}
                      className={`
                        flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200
                        ${bookingForm.final_payment_method === m
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

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                onClick={() => setStep('booking-2')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="button"
                id="booking-3-next"
                disabled={
                  !bookingForm.rate_per_night || parseFloat(bookingForm.rate_per_night) <= 0 ||
                  (bookingForm.has_prepayment && (!bookingForm.prepayment_amount || parseFloat(bookingForm.prepayment_amount) <= 0 || bookingForm.prepayment_method === 'none'))
                }
                onClick={() => setStep('booking-4')}
                className="btn-primary"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Booking Step 4: Summary & Confirm */}
        {step === 'booking-4' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 4: Review & Save</h3>
                <p className="text-xs text-slate-500">Review final invoice before registration</p>
              </div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                Ready to Save
              </span>
            </div>

            <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm border-b border-[#334155]/50 pb-4">
                <div>
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Guest Name</span>
                  <span className="text-slate-100 font-medium">{bookingForm.client_name}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Room Number</span>
                  <span className="text-slate-100 font-medium">{bookingForm.room_number}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Platform</span>
                  <span className="text-slate-100 font-medium">{bookingForm.platform}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Duration of Stay</span>
                  <span className="text-slate-100 font-medium">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm pt-2">
                <div className="flex justify-between text-slate-400">
                  <span>Room Cost ({nights} nights × ֏{parseFloat(bookingForm.rate_per_night).toLocaleString()})</span>
                  <span className="text-slate-200 font-medium">֏{roomCost.toLocaleString()}</span>
                </div>
                {bookingForm.has_prepayment && prepayAmt > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Prepayment ({bookingForm.prepayment_method === 'cash' ? '💵 Cash' : '💳 Card'})</span>
                    <span className="text-amber-400 font-medium">− ֏{prepayAmt.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-100 border-t border-[#334155] pt-2.5 mt-2 text-base">
                  <span>Balance Due</span>
                  <span className="text-sky-400">֏{(roomCost - prepayAmt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Final Payment Method</span>
                  <span className="font-semibold">{bookingForm.final_payment_method === 'cash' ? '💵 Cash' : '💳 Card'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep('booking-3')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="button"
                id="booking-confirm"
                disabled={loading}
                onClick={saveBooking}
                className="btn-primary px-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  '✓ Save Booking'
                )}
              </button>
            </div>
          </div>
        )}


        {/* ══════════════════════════════════════════════════════
            PATH B: ADD SERVICE TO GUEST
            ══════════════════════════════════════════════════════ */}

        {/* Service Step 1: Select Guest */}
        {step === 'service-1' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 1: Select Guest</h3>
                <p className="text-xs text-slate-500">Find the guest currently staying with us</p>
              </div>
              <span className="text-xs text-violet-400 font-bold uppercase tracking-wider bg-violet-950/50 border border-violet-800/50 px-2.5 py-1 rounded-full">
                Step 1 of 3
              </span>
            </div>

            <div className="relative">
              <input
                id="guest-search"
                type="text"
                className="input pl-9"
                placeholder="Search by guest name, room number, platform…"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {fetchingBookings ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg skeleton" />
                ))
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-sm">
                  No active or recently checked-in guests found.
                </div>
              ) : (
                filteredBookings.map((b) => {
                  const isSelected = selectedBookingId === b.id
                  const isOut = new Date(b.check_out) < new Date()
                  return (
                    <button
                      key={b.id}
                      id={`wizard-select-guest-${b.id}`}
                      type="button"
                      onClick={() => setSelectedBookingId(b.id)}
                      className={`
                        w-full text-left px-4 py-3 rounded-lg border transition-all duration-200
                        ${isSelected
                          ? 'bg-violet-950/20 border-violet-600/50'
                          : 'bg-[#0f172a] border-[#334155] hover:border-[#475569]'
                        }
                        ${isOut ? 'opacity-60' : ''}
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
                        {isOut ? (
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

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                onClick={() => setStep('selection')}
                className="btn-secondary"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                id="service-1-next"
                disabled={!selectedBookingId}
                onClick={() => setStep('service-2')}
                className="btn-primary"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Service Step 2: Service Details */}
        {step === 'service-2' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 2: Service Details</h3>
                <p className="text-xs text-slate-500">Provide type, cost, date, and payment method</p>
              </div>
              <span className="text-xs text-violet-400 font-bold uppercase tracking-wider bg-violet-950/50 border border-violet-800/50 px-2.5 py-1 rounded-full">
                Step 2 of 3
              </span>
            </div>

            {selectedBooking && (
              <div className="px-3 py-2.5 bg-violet-900/10 border border-violet-800/30 rounded-lg">
                <p className="text-xs text-violet-400 font-semibold">Adding service for:</p>
                <p className="text-sm text-slate-200 mt-0.5">
                  Room {selectedBooking.room_number} — {selectedBooking.client_name}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Quick Picks */}
              <div>
                <label className="label">Quick Pick</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SERVICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      id={`wizard-quick-${s.toLowerCase()}`}
                      onClick={() => setServiceName(s)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200
                        ${serviceName === s
                          ? 'bg-violet-600/30 text-violet-300 border-violet-600/50'
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
                <label htmlFor="s-name" className="label">Service Name</label>
                <input
                  id="s-name"
                  type="text"
                  className="input"
                  placeholder="or type custom service name…"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="s-amount" className="label">Amount (֏)</label>
                  <input
                    id="s-amount"
                    type="number"
                    min="0"
                    step="100"
                    className="input"
                    placeholder="0"
                    value={serviceAmount}
                    onChange={(e) => setServiceAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="s-date" className="label">Service Date & Time</label>
                  <input
                    id="s-date"
                    type="datetime-local"
                    className="input"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Payment Method</label>
                <div className="flex gap-3">
                  {(['cash', 'card'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      id={`s-method-${m}`}
                      onClick={() => setServicePaymentMethod(m)}
                      className={`
                        flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200
                        ${servicePaymentMethod === m
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

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                onClick={() => setStep('service-1')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="button"
                id="service-2-next"
                disabled={!serviceName.trim() || !serviceAmount || parseFloat(serviceAmount) <= 0 || !serviceDate}
                onClick={() => setStep('service-3')}
                className="btn-primary"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Service Step 3: Summary & Confirm */}
        {step === 'service-3' && (
          <div className="card space-y-6">
            <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Step 3: Review & Save</h3>
                <p className="text-xs text-slate-500">Confirm extra service log details</p>
              </div>
              <span className="text-xs text-violet-400 font-bold uppercase tracking-wider bg-violet-950/50 border border-violet-800/50 px-2.5 py-1 rounded-full">
                Ready to Save
              </span>
            </div>

            {selectedBooking && (
              <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm pb-1">
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Guest</span>
                    <span className="text-slate-100 font-medium">Room {selectedBooking.room_number} — {selectedBooking.client_name}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Service Logged</span>
                    <span className="text-slate-100 font-medium">{serviceName}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Cost / Amount</span>
                    <span className="text-violet-400 font-bold text-base">֏{parseFloat(serviceAmount).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Payment Method</span>
                    <span className="text-slate-100 font-medium">{servicePaymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}</span>
                  </div>
                  <div className="col-span-2 mt-1 pt-2 border-t border-[#334155]/40">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Date Logged</span>
                    <span className="text-slate-300 font-medium">{new Date(serviceDate).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-4 pt-4 border-t border-[#334155]/50">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep('service-2')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="button"
                id="service-confirm"
                disabled={loading}
                onClick={saveService}
                className="btn-primary px-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  '✓ Add Service'
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
