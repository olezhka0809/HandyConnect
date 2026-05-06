import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase env vars. Create client/.env.local with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
	)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Dezactivează Web Locks API — rezolvă timeout-ul în Codespaces și multi-tab
    lock: (_name, _timeout, fn) => fn(),
  },
})