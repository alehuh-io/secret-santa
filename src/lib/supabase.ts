import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface Participant {
  id: string;
  name: string;
  family: string;
  email: string | null;
  created_at: string;
}

export interface Draw {
  id: string;
  user_id: string;
  user_email: string;
  participant_id: string;
  participant_name?: string;
  drawn_at: string;
}

export interface DrawResult {
  participant_id: string | null;
  participant_name: string | null;
  already_drawn: boolean;
  no_participants_remaining: boolean;
}
