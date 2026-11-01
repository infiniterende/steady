/**
 * Supabase's dashboard now calls the browser-safe key "publishable"; older projects and the
 * local CLI call it "anon". Accept either, preferring the publishable one.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
