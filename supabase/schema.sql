-- ============================================================
-- Garden Inn Hotel Management System
-- PostgreSQL Schema (Supabase)
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: bookings
-- Main booking ledger – one row per reservation
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number          VARCHAR(20)  NOT NULL,
  client_name          VARCHAR(255) NOT NULL,
  platform             VARCHAR(100) NOT NULL,
  check_in             TIMESTAMPTZ  NOT NULL,
  check_out            TIMESTAMPTZ  NOT NULL,
  rate_per_night       NUMERIC(12,2) NOT NULL CHECK (rate_per_night >= 0),
  prepayment_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prepayment_amount >= 0),
  prepayment_method    VARCHAR(10)  NOT NULL DEFAULT 'none'
                           CHECK (prepayment_method IN ('cash', 'card', 'none')),
  final_payment_method VARCHAR(10)  NOT NULL
                           CHECK (final_payment_method IN ('cash', 'card')),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: additional_services
-- Independent ledger for add-ons (breakfast, laundry, etc.)
-- NEVER mutates the parent booking record.
-- Each service is an immutable append-only entry.
-- ============================================================
CREATE TABLE IF NOT EXISTS additional_services (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID          NOT NULL
                     REFERENCES bookings(id) ON DELETE CASCADE,
  service_name   VARCHAR(255)  NOT NULL,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(10)   NOT NULL CHECK (payment_method IN ('cash', 'card')),
  date_added     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_additional_services_booking_id
  ON additional_services(booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_check_in
  ON bookings(check_in);

CREATE INDEX IF NOT EXISTS idx_bookings_check_out
  ON bookings(check_out);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON bookings(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- Permissive policy using the anon key (no auth required).
-- Tighten in production by replacing USING (true) with
-- USING (auth.role() = 'authenticated') and adding an auth
-- login screen.
-- ============================================================
ALTER TABLE bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_services ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to avoid conflicts on re-run
DROP POLICY IF EXISTS "allow_all_anon" ON bookings;
DROP POLICY IF EXISTS "allow_all_anon" ON additional_services;

CREATE POLICY "allow_all_anon"
  ON bookings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_anon"
  ON additional_services FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- DONE
-- ============================================================
