import { Search, Plus, Minus, ArrowUpRight, ArrowRight, Heart, Banknote, Trophy, UtensilsCrossed } from 'lucide-react'
import { FoodArt } from '../illustrations/FoodArt'
import type { Menu, Order } from '@/types'
import { OrderCard } from '../molecules/OrderCard'

interface Props {
  loading?: boolean;
  name: string; menus: Menu[]; categories: string[]; selectedCategory: string; onCategory: (category: string) => void
  search: string; onSearch: (value: string) => void; favorites: string[]; cart: (Menu & { quantity: number })[]
  onFavorite: (event: React.MouseEvent, id: string) => void; onAdd: (menu: Menu) => void; onQuantity: (id: string, delta: number) => void
  onManual: () => void; onInspiration: () => void; onTardut: () => void; onRanking: () => void
  recommendation: Menu | null; activeOrders: Order[]; onTrack: (code: string) => void
  formatRupiah: (amount: number) => string
}
export function PersonalMenu(props: Props) {
  const { name, menus, categories, selectedCategory, onCategory, search, onSearch, favorites, cart, onFavorite, onAdd, onQuantity, formatRupiah } = props
  const filtered = menus.filter(menu => menu.food_name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (selectedCategory === 'Semua' || (selectedCategory === '🌟 Favoritku' ? favorites.includes(menu.id) : menu.category === selectedCategory)))
  const isBrowsing = !search && selectedCategory === 'Semua'
  return <div className="personal-menu">
    <section className="home-greeting">
      <p className="eyebrow">Waktunya isi energi</p>
      <h1>Mau makan apa,<br /><span>{name.split(' ')[0] || 'teman'}?</span> <span className="greeting-wave">✦</span></h1>
      <p>Jajan favorit, diantar sampai meja.</p>
    </section>
    <div data-tour="user-search" className="menu-search">
      <Search size={20} aria-hidden="true" />
      <input type="search" aria-label="Cari menu" placeholder="Cari nasi, kopi, atau camilan..." value={search} onChange={event => onSearch(event.target.value)} />
      {search && <button aria-label="Hapus pencarian" onClick={() => onSearch('')}>×</button>}
    </div>

    {isBrowsing && <>
      <button data-tour="user-inspiration" className="inspiration-banner" onClick={props.onInspiration}>
        <div className="banner-copy"><span className="banner-tag"><span /> Inspirasi istirahat</span>
          <h2>Makan enak.<br />Mood ikut enak.</h2><p>Intip pilihan teman kantor.</p>
          <span className="banner-action">Cari inspirasi <ArrowUpRight size={15} /></span>
        </div>
        <FoodArt kind="meal" className="banner-food" />
        <span className="banner-spark spark-one">✦</span><span className="banner-spark spark-two">✧</span>
      </button>
      <div data-tour="user-services" className="quick-services">
        <button onClick={props.onTardut}><span className="service-icon"><Banknote size={21} /></span><span><strong>Tarik duit</strong><small>Dibantu OB</small></span><ArrowUpRight size={16} /></button>
        <button onClick={props.onRanking}><span className="service-icon service-peach"><Trophy size={20} /></span><span><strong>Menu populer</strong><small>Favorit sekantor</small></span><ArrowUpRight size={16} /></button>
      </div>
    </>}
    {props.activeOrders.length > 0 && <section className="active-order-section">
      <div className="section-heading"><h2>Pesananmu diproses</h2><span className="count-pill">{props.activeOrders.length}</span></div>
      <div className="space-y-3">{props.activeOrders.map(order => <OrderCard key={order.id} role="user" order={order} formatRupiah={formatRupiah} onTrack={props.onTrack} />)}</div>
    </section>}
    <section>
      <div className="section-heading"><h2>Pilih seleramu</h2><span>Selalu ada pilihan</span></div>
      <div className="category-rail" role="group" aria-label="Kategori menu">
        {categories.map(category => <button key={category} className={`category-tile ${selectedCategory === category ? 'is-active' : ''}`} aria-pressed={selectedCategory === category} onClick={() => onCategory(category)}>
          <span className="category-image">{category === 'Semua' ? <UtensilsCrossed size={26} /> : category === '🌟 Favoritku' ? <Heart size={26} /> : <FoodArt category={category} />}</span>
          <span>{category === '🌟 Favoritku' ? 'Favorit' : category}</span>
        </button>)}
      </div>
    </section>
    <section className="menu-shortcuts" aria-label="Inspirasi dan pesanan manual">
    {isBrowsing && props.recommendation && <button className="recommendation-row" onClick={() => { onSearch(props.recommendation!.food_name) }}>
      <span className="recommendation-icon"><FoodArt name={props.recommendation.food_name} category={props.recommendation.category} /></span>
      <span><small>Bisa jadi pilihanmu</small><strong>{props.recommendation.food_name}</strong></span><ArrowRight size={18} />
    </button>}
      <button data-tour="user-manual" className="manual-order-button" onClick={props.onManual}><span className="manual-plus"><Plus size={21} /></span><span><strong>Menu favoritmu belum ada?</strong><small>Tulis nama makanan dan harganya sendiri.</small></span><ArrowUpRight size={18} /></button>
    </section>
    <section className="menu-results">
      <div data-tour={filtered.length ? undefined : "user-menu"} className="section-heading"><h2>{search ? 'Hasil pencarian' : selectedCategory === '🌟 Favoritku' ? 'Menu favoritmu' : 'Menu hari ini'}</h2><span>{filtered.length} pilihan</span></div>
      <p className="illustration-note">Ilustrasi kategori, bukan foto menu sebenarnya.</p>
      {props.loading && <div className="menu-loading" role="status" aria-label="Memuat menu">{[1,2,3].map(item => <div key={item} className="menu-skeleton"><span /><div><i /><i /></div></div>)}</div>}
      <div className="menu-list">{!props.loading && filtered.map((menu, index) => {
        const quantity = cart.find(item => item.id === menu.id)?.quantity ?? 0
        return <article data-tour={index === 0 ? "user-menu" : undefined} key={menu.id} className={`food-menu-card ${quantity ? 'is-selected' : ''}`}>
          <div className="food-menu-art"><FoodArt name={menu.food_name} category={menu.category} /></div>
          <div className="food-menu-content"><p className="menu-category">{menu.category || 'Pilihan lainnya'}</p><h3>{menu.food_name}</h3>
            <div className="menu-card-bottom"><strong>{formatRupiah(menu.price)}</strong>
              {quantity ? <div className="quantity-stepper"><button aria-label={`Kurangi ${menu.food_name}`} onClick={() => onQuantity(menu.id, -1)}><Minus size={15} /></button><span aria-live="polite">{quantity}</span><button aria-label={`Tambah ${menu.food_name}`} onClick={() => onQuantity(menu.id, 1)}><Plus size={15} /></button></div>
                : <button className="add-menu-button" aria-label={`Tambah ${menu.food_name}`} onClick={() => onAdd(menu)}><Plus size={17} /><span>Tambah</span></button>}
            </div>
          </div>
          <button className={`favorite-button ${favorites.includes(menu.id) ? 'is-favorite' : ''}`} aria-label={`Favoritkan ${menu.food_name}`} aria-pressed={favorites.includes(menu.id)} onClick={event => onFavorite(event, menu.id)}><Heart size={17} fill={favorites.includes(menu.id) ? 'currentColor' : 'none'} /></button>
        </article>
      })}</div>
      {!props.loading && !filtered.length && <div className="empty-menu"><FoodArt kind="other" /><h3>{selectedCategory === '🌟 Favoritku' ? 'Simpan menu kesukaanmu' : 'Belum ketemu, nih'}</h3><p>{selectedCategory === '🌟 Favoritku' ? 'Ketuk ikon hati pada menu untuk menyimpannya di sini.' : 'Coba kata kunci atau kategori lain. Kamu juga bisa menulis pesanan sendiri.'}</p><button onClick={() => { onSearch(''); onCategory('Semua') }}>Lihat semua menu <ArrowRight size={16} /></button></div>}

    </section>
    <p className="home-footer">Dari kantor, untuk teman sekantor. <span>makanmana.</span></p>
  </div>
}
