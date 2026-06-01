import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Habit = {
  id: string;
  user_id: string;
  label: string;
  emoji: string;
  category: string;
  position: number;
  created_at: string;
};

export type DailyLog = {
  id: string;
  user_id: string;
  date: string;
  habit_id: string;
  done: boolean;
  created_at: string;
};

export type Category = "health" | "trading" | "discipline" | "lifestyle" | "mind";

export const CATEGORY_COLORS: Record<string, string> = {
  health: "#4ade80",
  trading: "#60a5fa",
  discipline: "#f87171",
  lifestyle: "#fbbf24",
  mind: "#c084fc",
};

export const DEFAULT_HABITS: Omit<Habit, "id" | "user_id" | "created_at">[] = [
  { label: "1 or 2 pairs", emoji: "👟", category: "lifestyle", position: 0 },
  { label: "1 pattern/model", emoji: "📐", category: "trading", position: 1 },
  { label: "Frequent gym session", emoji: "🏋️", category: "health", position: 2 },
  { label: "No carbonated drinks", emoji: "🚫", category: "health", position: 3 },
  { label: "No sex", emoji: "🔒", category: "discipline", position: 4 },
  { label: "No womanizing", emoji: "🛡️", category: "discipline", position: 5 },
  { label: "No alcohol", emoji: "🍃", category: "health", position: 6 },
  { label: "Fixed Risk to Reward", emoji: "📊", category: "trading", position: 7 },
  { label: "2 chapters from any book", emoji: "📖", category: "mind", position: 8 },
  { label: "Water before & after sleep", emoji: "💧", category: "health", position: 9 },
  { label: "Evening nature walk", emoji: "🌿", category: "mind", position: 10 },
];
