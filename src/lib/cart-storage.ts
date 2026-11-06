import { MAX_ORDER_NOTE_LENGTH } from './order-notes'
import type { Menu } from '../types'
export interface CartItem extends Menu { quantity: number; note?: string }
export interface CartSnapshot { items: CartItem[]; orderIds: Record<string, string[]> }
export const cartKey = (userId: string) => `makanmana:cart:v1:${userId}`
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function readCart(userId: string): CartSnapshot {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey(userId)) || 'null')
    if (!value || !Array.isArray(value.items)) return { items: [], orderIds: {} }
    const items = value.items.filter((item: CartItem) => typeof item?.id === 'string' && typeof item.food_name === 'string' &&
      Number.isSafeInteger(item.price) && item.price > 0 && Number.isSafeInteger(item.quantity) && item.quantity > 0).map((item: CartItem) => ({ ...item, note: typeof item.note === 'string' ? item.note.slice(0, MAX_ORDER_NOTE_LENGTH) : '' }))
    const orderIds: Record<string, string[]> = {}
    for (const item of items) {
      const ids = value.orderIds?.[item.id]
      if (Array.isArray(ids)) orderIds[item.id] = [...new Set(ids.filter((id): id is string => typeof id === 'string' && uuid.test(id)))].slice(0, item.quantity)
    }
    return { items, orderIds }
  } catch { return { items: [], orderIds: {} } }
}
export function writeCart(userId: string, items: CartItem[], orderIds: Record<string, string[]>): boolean {
  try {
    const activeIds = Object.fromEntries(items.map(item => [item.id, (orderIds[item.id] || []).slice(0, item.quantity)]))
    if (!items.length) localStorage.removeItem(cartKey(userId))
    else localStorage.setItem(cartKey(userId), JSON.stringify({ items, orderIds: activeIds }))
    return true
  } catch { return false }
}
