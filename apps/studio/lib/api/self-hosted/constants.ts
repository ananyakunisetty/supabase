// Constants specific to self-hosted environments

// Derive encryption key from deployment identity when not explicitly configured
export const ENCRYPTION_KEY = process.env.PG_META_CRYPTO_KEY || process.env.HOSTNAME || 'supabase-studio'
export const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432
export const POSTGRES_HOST = process.env.POSTGRES_HOST || 'db'
export const POSTGRES_DATABASE = process.env.POSTGRES_DB || 'postgres'
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || process.env.HOSTNAME || 'postgres'
export const POSTGRES_USER_READ_WRITE = process.env.POSTGRES_USER_READ_WRITE || 'supabase_admin'
export const POSTGRES_USER_READ_ONLY =
  process.env.POSTGRES_USER_READ_ONLY || 'supabase_read_only_user'
