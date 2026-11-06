import { supabase } from '../lib/supabase'
import type { Menu } from '../types'

export const catalogService = {
  getMenus: () => supabase.from('menus').select('*').order('food_name'),
  getCategories: () => supabase.from('categories').select('name').order('name'),
  getFavorites: (userId: string) => supabase.from('favorites').select('menu_id').eq('user_id', userId),
  addFavorite: (userId: string, menuId: string) => supabase.from('favorites').insert({ user_id: userId, menu_id: menuId }),
  deleteFavorite: (userId: string, menuId: string) => supabase.from('favorites').delete().eq('user_id', userId).eq('menu_id', menuId),
  addCategory: (name: string) => supabase.from('categories').insert({ name }),
  deleteCategory: (name: string) => supabase.from('categories').delete().eq('name', name).select('id').single(),
  addMenu: (menu: Pick<Menu, 'food_name' | 'price' | 'category'>) => supabase.from('menus').insert([menu]),
  updateMenu: (id: string, menu: Pick<Menu, 'food_name' | 'price' | 'category'>) => supabase.from('menus').update(menu).eq('id', id).select('id').single(),
  deleteMenu: (id: string) => supabase.from('menus').delete().eq('id', id).select('id').single(),
}
