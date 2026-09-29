/**
 * Mock file to prevent frontend import errors 
 * while transitioning from Supabase to Django.
 */
export const supabase = new Proxy({}, {
  get: () => () => ({ data: null, error: null, select: () => ({ eq: () => ({ order: () => ({ limit: () => ({}) }) }) }) })
}) as any;

export function isSupabaseConfigured() {
  return false; // Tells the template code to strictly use your new Django adapters!
}
