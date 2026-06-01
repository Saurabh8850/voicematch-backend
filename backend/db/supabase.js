const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY missing — database calls will fail"
  );
}

const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder", {
  realtime: {
    transport: ws,
  },
});

module.exports = supabase;
