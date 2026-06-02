import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rftynrclbvnmemjvmrmx.supabase.co'
const supabaseKey = 'sb_publishable_vbOO5YSdR2C1mi_sWDmrhQ_nbdur_FE'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to invoke Edge Functions with improved error parsing
export async function invokeFunction(name, options = {}) {
  try {
    const res = await supabase.functions.invoke(name, options)

    // If SDK returned an error, try to parse JSON body-like messages
    if (res.error) {
      const err = res.error
      // Try to extract JSON from message or body fields
      const source = err?.message || err?.body || ''
      try {
        const parsed = JSON.parse(source)
        return { data: parsed, error: null, status: err?.status || null }
      } catch (e) {
        // If not JSON, return a structured Error with original message and status
        const outErr = new Error(source || err.message || 'Edge function error')
        outErr.status = err?.status || null
        return { data: res.data, error: outErr, status: outErr.status }
      }
    }

    // If data is a JSON string, parse it for convenience
    let data = res.data
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch (e) {}
    }

    return { data, error: null, status: 200 }
  } catch (e) {
    // Network or unexpected error
    return { data: null, error: e, status: e?.status || null }
  }
}
