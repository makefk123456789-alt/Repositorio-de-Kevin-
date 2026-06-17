import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evppovogdwivjlmvmlrk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cHBvdm9nZHdpdmpsbXZtbHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjgxNTEsImV4cCI6MjA5NDA0NDE1MX0.R1tBujBLRGZElWmjPnlhPdLE5ULJ0r2v15wpZvDmyFo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
