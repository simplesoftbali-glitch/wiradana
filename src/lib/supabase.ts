/**
 * File: src/lib/supabase.ts
 * Description: This file contains the configuration and initialization of the Supabase client.
 */

import { createClient } from '@supabase/supabase-js'

/**
 * The URL of the Supabase instance.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * The anonymous key for accessing the Supabase instance.
 */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * The initialized Supabase client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
