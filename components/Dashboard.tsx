'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Booking, AdditionalService, BookingWithServices } from '@/types'
import { useToast, Toast } from '@/components/Toast'

// ── helpers ──────────────────────────────────────────────────
function calcNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function enrichBooking(
  booking: Booking,
  services: AdditionalService[]
): BookingWithServices {
  const nights = calcNights(booking.check_in, booking.check_out)
  const room_cost = booking.rate_per_night * nights
  const extras_total = services.reduce((s, x) => s + Number(x.amount), 0)
  const total_revenue = room_cost + extras_total
  const is_checked_out = new Date(booking.check_out) < new Date()

  return {
    ...booking,
    additional_services: services,
    nights,
    room_cost,
    extras_total,
    total_revenue,
    is_checked_out,
  }
}

function fmt(n: number): string {
  return `֏${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── component ────────────────────────────────────────────────
export default function Dashboard() {
  const [rows, setRows] = useState<BookingWithServices[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'checked-out'>('all')
  const [sortField, setSortField] = useState<'check_in' | 'check_out' | 'total_revenue' | 'room_number'>('check_in')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { toasts, addToast, dismissToast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: bookingsData, error: bErr }, { data: servicesData, error: sErr }] =
        await Promise.all([
          supabase.from('bookings').select('*').order('check_in', { ascending: false }),
          supabase.from('additional_services').select('*').order('date_added', { ascending: true }),
        ])

      if (bErr) throw bErr
      if (sErr) throw sErr

      const servicesByBooking = (servicesData ?? []).reduce<Record<string, AdditionalService[]>>(
        (acc, svc) => {
          if (!acc[svc.booking_id]) acc[svc.booking_id] = []
          acc[svc.booking_id].push(svc)
          return acc
        },
        {}
      )

      const enriched = (bookingsData ?? []).map((b) =>
        enrichBooking(b, servicesByBooking[b.id] ?? [])
      )

      setRows(enriched)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── filtering & sorting ──
  const filtered = rows
    .filter((r) => {
      if (filterStatus === 'active' && r.is_checked_out) return false
      if (filterStatus === 'checked-out' && !r.is_checked_out) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.room_number.toLowerCase().includes(q) ||
          r.client_name.toLowerCase().includes(q) ||
          r.platform.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'check_in')       cmp = new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
      else if (sortField === 'check_out') cmp = new Date(a.check_out).getTime() - new Date(b.check_out).getTime()
      else if (sortField === 'total_revenue') cmp = a.total_revenue - b.total_revenue
      else if (sortField === 'room_number')   cmp = a.room_number.localeCompare(b.room_number)
      return sortDir === 'asc' ? cmp : -cmp
    })

  // ── totals ──
  const totals = filtered.reduce(
    (acc, r) => ({
      room_cost:     acc.room_cost + r.room_cost,
      prepayment:    acc.prepayment + Number(r.prepayment_amount),
      extras:        acc.extras + r.extras_total,
      total_revenue: acc.total_revenue + r.total_revenue,
    }),
    { room_cost: 0, prepayment: 0, extras: 0, total_revenue: 0 }
  )

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 opacity-50">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  // ── print ──
  const handlePrint = () => window.print()

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* ── Screen view ── */}
      <div className="animate-fade-in">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Financial Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">
              {filtered.length} booking{filtered.length !== 1 ? 's' : ''} · Click a row to see extras
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              id="refresh-dashboard"
              onClick={fetchData}
              className="btn-secondary text-xs py-2 px-3"
            >
              ↺ Refresh
            </button>
            <button
              id="print-report"
              onClick={handlePrint}
              className="btn-primary text-xs py-2 px-4"
            >
              🖨 Print Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5 print:hidden">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <input
              id="dashboard-search"
              type="text"
              className="input pl-8 text-xs py-2"
              placeholder="Search room, name, platform…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
          </div>

          <div className="flex gap-2">
            {(['all', 'active', 'checked-out'] as const).map((s) => (
              <button
                key={s}
                id={`filter-${s}`}
                onClick={() => setFilterStatus(s)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                  ${filterStatus === s
                    ? 'bg-sky-600/30 text-sky-300 border-sky-600/50'
                    : 'bg-[#1e293b] text-slate-400 border-[#334155] hover:border-[#475569]'
                  }
                `}
              >
                {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Checked Out'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
          {[
            { label: 'Room Revenue', value: totals.room_cost,     color: 'text-sky-400' },
            { label: 'Prepayments',  value: totals.prepayment,    color: 'text-amber-400' },
            { label: 'Extra Services', value: totals.extras,      color: 'text-violet-400' },
            { label: 'Total Revenue',  value: totals.total_revenue, color: 'text-emerald-400' },
          ].map((card) => (
            <div key={card.label} className="card py-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.color}`}>{fmt(card.value)}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg skeleton" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <p className="text-4xl mb-3">◈</p>
                <p className="text-sm">No bookings found</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('room_number')}
                    >
                      Room <SortIcon field="room_number" />
                    </th>
                    <th>Guest</th>
                    <th
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('check_in')}
                    >
                      Check-In <SortIcon field="check_in" />
                    </th>
                    <th
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('check_out')}
                    >
                      Check-Out <SortIcon field="check_out" />
                    </th>
                    <th>Platform</th>
                    <th>Nights</th>
                    <th>Rate/Night</th>
                    <th>Room Cost</th>
                    <th>Prepayment</th>
                    <th>Extras</th>
                    <th>Final Pmt</th>
                    <th
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('total_revenue')}
                    >
                      Total <SortIcon field="total_revenue" />
                    </th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <>
                      <tr
                        key={row.id}
                        className={`cursor-pointer ${row.is_checked_out ? 'checked-out' : ''}`}
                        onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      >
                        <td className="font-semibold text-slate-100">{row.room_number}</td>
                        <td>{row.client_name}</td>
                        <td className="text-slate-400">{fmtDate(row.check_in)}</td>
                        <td className="text-slate-400">{fmtDate(row.check_out)}</td>
                        <td>
                          <span className="px-2 py-0.5 bg-[#0f172a] rounded text-xs text-slate-400 border border-[#334155]">
                            {row.platform}
                          </span>
                        </td>
                        <td className="text-center">{row.nights}</td>
                        <td>{fmt(row.rate_per_night)}</td>
                        <td className="text-sky-400 font-medium">{fmt(row.room_cost)}</td>
                        <td>
                          {Number(row.prepayment_amount) > 0 ? (
                            <span className="flex flex-col gap-1">
                              <span className="text-amber-400 font-medium">{fmt(Number(row.prepayment_amount))}</span>
                              <span className={row.prepayment_method === 'cash' ? 'badge-cash' : 'badge-card'}>
                                {row.prepayment_method}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td>
                          {row.extras_total > 0 ? (
                            <span className="text-violet-400 font-medium">{fmt(row.extras_total)}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td>
                          <span className={row.final_payment_method === 'cash' ? 'badge-cash' : 'badge-card'}>
                            {row.final_payment_method}
                          </span>
                        </td>
                        <td className="text-emerald-400 font-bold">{fmt(row.total_revenue)}</td>
                        <td>
                          {row.is_checked_out ? (
                            <span className="badge-checked-out">Checked Out</span>
                          ) : (
                            <span className="badge-active">Active</span>
                          )}
                        </td>
                      </tr>

                      {/* ── Expanded extras row ── */}
                      {expandedId === row.id && (
                        <tr key={`${row.id}-expanded`} className="bg-[#0f172a]/60">
                          <td colSpan={13} className="px-6 py-4">
                            {row.additional_services.length === 0 ? (
                              <p className="text-xs text-slate-600 italic">No additional services recorded for this booking.</p>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                  Additional Services
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="text-left py-1 font-medium">Date</th>
                                      <th className="text-left py-1 font-medium">Service</th>
                                      <th className="text-right py-1 font-medium">Amount</th>
                                      <th className="text-left py-1 font-medium pl-4">Method</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.additional_services.map((svc) => (
                                      <tr key={svc.id} className="border-t border-[#334155]/50">
                                        <td className="py-1.5 text-slate-500">{fmtDateTime(svc.date_added)}</td>
                                        <td className="py-1.5 text-slate-200">{svc.service_name}</td>
                                        <td className="py-1.5 text-violet-400 text-right font-semibold">{fmt(svc.amount)}</td>
                                        <td className="py-1.5 pl-4">
                                          <span className={svc.payment_method === 'cash' ? 'badge-cash' : 'badge-card'}>
                                            {svc.payment_method}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="border-t-2 border-[#334155]">
                                      <td colSpan={2} className="py-1.5 text-slate-400 font-semibold">Subtotal</td>
                                      <td className="py-1.5 text-violet-400 font-bold text-right">{fmt(row.extras_total)}</td>
                                      <td />
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>

                {/* Totals footer */}
                <tfoot>
                  <tr className="bg-[#0f172a] border-t-2 border-[#334155]">
                    <td colSpan={7} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Totals ({filtered.length} bookings)
                    </td>
                    <td className="px-4 py-3 text-sky-400 font-bold">{fmt(totals.room_cost)}</td>
                    <td className="px-4 py-3 text-amber-400 font-bold">{fmt(totals.prepayment)}</td>
                    <td className="px-4 py-3 text-violet-400 font-bold">{fmt(totals.extras)}</td>
                    <td />
                    <td className="px-4 py-3 text-emerald-400 font-bold text-lg">{fmt(totals.total_revenue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PRINT AREA — only visible when printing
          ══════════════════════════════════════════════════════ */}
      <div id="print-area" className="hidden print:block">
        {/* Print header */}
        <div id="print-header">
          <h1>Garden Inn — Financial Report</h1>
          <p>Generated: {new Date().toLocaleString('en-GB')} · {filtered.length} booking(s)</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Guest</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Platform</th>
              <th>Nts</th>
              <th>Rate/Night</th>
              <th>Room Cost</th>
              <th>Prepayment</th>
              <th>Pre. Method</th>
              <th>Extras</th>
              <th>Final Pmt</th>
              <th>Total Revenue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`print-${row.id}`}>
                <td>{row.room_number}</td>
                <td>{row.client_name}</td>
                <td>{fmtDate(row.check_in)}</td>
                <td>{fmtDate(row.check_out)}</td>
                <td>{row.platform}</td>
                <td style={{ textAlign: 'center' }}>{row.nights}</td>
                <td>{fmt(row.rate_per_night)}</td>
                <td>{fmt(row.room_cost)}</td>
                <td>{Number(row.prepayment_amount) > 0 ? fmt(Number(row.prepayment_amount)) : '—'}</td>
                <td>{row.prepayment_method !== 'none' ? row.prepayment_method : '—'}</td>
                <td>{row.extras_total > 0 ? fmt(row.extras_total) : '—'}</td>
                <td>{row.final_payment_method}</td>
                <td style={{ fontWeight: 700 }}>{fmt(row.total_revenue)}</td>
                <td>{row.is_checked_out ? 'Checked Out' : 'Active'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>TOTALS ({filtered.length} bookings)</td>
              <td>{fmt(totals.room_cost)}</td>
              <td>{fmt(totals.prepayment)}</td>
              <td />
              <td>{fmt(totals.extras)}</td>
              <td />
              <td style={{ fontWeight: 700 }}>{fmt(totals.total_revenue)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
