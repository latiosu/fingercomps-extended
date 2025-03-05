import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://dfbzmtaupuuveeawjsgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnptdGF1cHV1dmVlYXdqc2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyODMyMTEsImV4cCI6MjA1NTg1OTIxMX0.szNcyWczThjDF1uwFDakDdr30xIgq3pfcCvyXCZg6CY';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);