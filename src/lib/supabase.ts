/**
 * File: src/lib/supabase.ts
 * Description: This file contains the configuration and initialization of the Supabase client.
 */

import { createClient } from '@supabase/supabase-js'

/**
 * The URL of the Supabase instance.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * The anonymous key for accessing the Supabase instance.
 */
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isDummyValue = (value: string) => /dummy|example|placeholder|your[-_ ]/i.test(value)

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) &&
  supabaseAnonKey.length >= 20 &&
  !isDummyValue(supabaseUrl) &&
  !isDummyValue(supabaseAnonKey)
}

/**
 * The initialized Supabase client.
 */
export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'invalid-supabase-anon-key'
)
