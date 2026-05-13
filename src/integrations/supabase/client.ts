/**
 * SUPABASE DEPRECATED
 * The platform has migrated to a custom PostgreSQL backend.
 * Please use apiFetch from '@/utils/api' instead.
 */

export const supabase = new Proxy({} as any, {
    get: (_, prop) => {
        throw new Error(`Legacy Supabase access detected! Attempted to access property '${String(prop)}'. Please migrate this component to apiFetch.`);
    }
});