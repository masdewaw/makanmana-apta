import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bcosrhpjzlzqhgmbjkmf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjb3NyaHBqemx6cWhnbWJqa21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTEzNTgsImV4cCI6MjA5MDY4NzM1OH0.7B7GPjbGre8AinKl2iAvgzC5kZK88-UjXI1g_cxqOIk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
