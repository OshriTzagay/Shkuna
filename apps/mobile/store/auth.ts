import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { User } from "@shkuna/db";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) console.error("fetchProfile error:", error.message);
    if (data) set({ profile: data });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
