import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "../constants/config";

let supabaseClient = null;

function getSupabase() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/**
 * Subscribe to new messages for a match.
 * @returns {() => void} unsubscribe function
 */
export function subscribeToMessages(matchId, onNewMessage) {
  const supabase = getSupabase();
  if (!supabase || !matchId) {
    return () => {};
  }

  const channel = supabase
    .channel(`messages:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        if (payload?.new) {
          onNewMessage(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export { getSupabase };
