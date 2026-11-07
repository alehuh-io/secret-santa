import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Participant {
  id: string;
  name: string;
  family: string;
  created_at: string;
}

export interface Draw {
  id: string;
  drawer_id: string;
  drawn_at: string;
}

export type SignInStatus =
  | 'created'
  | 'ok'
  | 'invalid_password'
  | 'weak_password'
  | 'not_found';

export interface SignInResult {
  status: SignInStatus;
  participant_name: string | null;
  participant_family: string | null;
  match_name: string | null;
}

export type DrawStatus =
  | 'drawn'
  | 'already_drawn'
  | 'none_left'
  | 'blocked'
  | 'invalid_password';

export interface DrawResult {
  status: DrawStatus;
  match_name: string | null;
}

export interface ExchangeSession {
  participantId: string;
  participantName: string;
  participantFamily: string;
  password: string;
  matchName: string | null;
}
