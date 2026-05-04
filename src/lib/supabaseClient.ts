import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase runtime env", {
  hasUrl: Boolean(supabaseUrl),
  url: supabaseUrl,
  hasPublishableKey: Boolean(supabasePublishableKey),
  keyPrefix: supabasePublishableKey?.slice(0, 18),
});

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
