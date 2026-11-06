import { supabase } from './supabase'
import type { QueryClient } from '@tanstack/react-query'

// A dashboard and its drawers may mount the same hook many times.
// Share one channel per table/client and invalidate each prefix only once.
const clients = new WeakMap<QueryClient, Map<string, { release: () => void; keys: Map<string, number> }>>()
export function subscribeQueryTable(client: QueryClient, table: string, queryPrefix: string) {
  let tables = clients.get(client)
  if (!tables) { tables = new Map(); clients.set(client, tables) }
  let entry = tables.get(table)
  if (!entry) {
    const keys = new Map<string, number>()
    const invalidate = () => keys.forEach((_, key) => {
      void client.invalidateQueries({ queryKey: [key] })
    })
    const channel = supabase.channel(`query_${table}_${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, invalidate)
    entry = { keys, release: () => { void supabase.removeChannel(channel) } }
    tables.set(table, entry)
    channel.subscribe(status => { if (status === 'SUBSCRIBED') invalidate() })
  }
  entry.keys.set(queryPrefix, (entry.keys.get(queryPrefix) ?? 0) + 1)
  let released = false
  return () => {
    if (released) return
    released = true
    const count = (entry.keys.get(queryPrefix) ?? 1) - 1
    if (count) entry.keys.set(queryPrefix, count)
    else entry.keys.delete(queryPrefix)
    if (!entry.keys.size) { entry.release(); tables.delete(table) }
  }
}
