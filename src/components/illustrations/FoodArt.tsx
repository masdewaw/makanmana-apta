import { cn } from '@/lib/utils'

export type FoodKind = 'meal' | 'noodles' | 'drink' | 'snack' | 'other'
export function foodKind(name = '', category = ''): FoodKind {
  const text = `${name} ${category}`.toLowerCase()
  if (/minum|kopi|coffee|teh|tea|jus|juice|susu|es\b|coklat|cokelat|matcha|air mineral|soda/.test(text)) return 'drink'
  if (/mie|mi ayam|bakso|bihun|kwetiau|soto|sop|sup\b/.test(text)) return 'noodles'
  if (/camil|snack|goreng(an)?\b|roti|kue|pisang|risol|tahu|tempe|bakwan|pangsit|donat|martabak|cemil/.test(text) && !/nasi|ayam|bebek|ikan|lauk/.test(text)) return 'snack'
  if (/makan|nasi|ayam|bebek|ikan|telur|telor|sate|lauk|rendang|sayur|gado|pecel|ketoprak/.test(text)) return 'meal'
  return 'other'
}

/** Category illustrations, not photos of the actual menu. No external requests. */
export function FoodArt({ name = '', category = '', kind, className }: { name?: string; category?: string; kind?: FoodKind; className?: string }) {
  const type = kind ?? foodKind(name, category)
  return <svg viewBox="0 0 160 160" className={cn('food-art', className)} aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="132" rx="53" ry="9" fill="#203b2920" />
    {type === 'meal' && <>
      <ellipse cx="80" cy="94" rx="65" ry="42" fill="#e6e9de" />
      <ellipse cx="80" cy="88" rx="65" ry="40" fill="#fffefa" />
      <ellipse cx="80" cy="87" rx="54" ry="32" fill="#f3eee0" stroke="#e6dfca" />
      <path d="M47 88c-8-18 3-36 23-37 25-1 33 20 27 36-11 12-35 14-50 1" fill="#fffdf2" stroke="#e5ddbe" strokeWidth="2" />
      <path d="m54 75 4-3m5-11 3 1m8 12 4-3m-11 13 4 1m13-20 3 3m-2 13 3-1m-30 3 3 2" stroke="#d6ccac" strokeWidth="2" strokeLinecap="round" />
      <path d="M83 94c-1-10 10-27 24-26 14 2 22 20 17 30-6 13-37 13-41-4" fill="#c77837" stroke="#9e5429" strokeWidth="2" />
      <path d="m94 82 16 16m-9-22 15 16m-28-2 16 14" stroke="#9e5429" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="46" cy="99" rx="12" ry="15" transform="rotate(-35 46 99)" fill="#729955" stroke="#437843" strokeWidth="2" />
      <path d="m39 94 14 12m-8-15 9 11" stroke="#a7c780" strokeWidth="2" />
      <circle cx="68" cy="111" r="10" fill="#df7853" /><circle cx="68" cy="111" r="6" fill="#f4b276" /><path d="m66 105 4 12m-7-8 11 4" stroke="#f9d49b" strokeWidth="1.5" />
      <path d="M104 60c-2-9 1-16 8-19 6 10 0 15-8 19" fill="#4f8042" /><path d="M102 61c-9-1-14-6-15-12 11-4 16 3 15 12" fill="#81a559" />
    </>}
    {type === 'noodles' && <>
      <path d="M25 83h111c-6 37-26 48-55 48S31 116 25 83" fill="#dfb574" />
      <path d="M31 94h99c-6 21-23 33-49 33S38 116 31 94" fill="#f1d6a5" />
      <ellipse cx="80" cy="81" rx="57" ry="30" fill="#fffbef" stroke="#d9b87c" strokeWidth="3" />
      <ellipse cx="80" cy="82" rx="48" ry="22" fill="#c88e48" />
      <path d="M43 83c15-25 20 21 34 0s23 17 39-2M42 90c17-23 25 21 38-1s24 16 35-6M47 75c14-10 22 21 34 2s20 7 28 2" fill="none" stroke="#f3d67c" strokeWidth="5" strokeLinecap="round" />
      <circle cx="99" cy="69" r="13" fill="#a87857" /><path d="m93 66 9-2" stroke="#d2a27a" strokeWidth="2" strokeLinecap="round" />
      <path d="M49 75c-13-10-7-24 4-23 14-5 20 13 10 20" fill="#659154" /><path d="m52 56 7 18" stroke="#b7cd86" strokeWidth="2" />
      <ellipse cx="78" cy="67" rx="12" ry="16" transform="rotate(28 78 67)" fill="#fff8dc" /><ellipse cx="78" cy="68" rx="7" ry="9" fill="#eeb44c" />
      <path d="m106 62 25-31m-16 35 25-31" stroke="#79503b" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 37q-9-9 0-16m19 15q-9-9 0-16" fill="none" stroke="#c4c9b7" strokeWidth="3" strokeLinecap="round" />
    </>}
    {type === 'drink' && <>
      <path d="m48 48 8 74q2 13 24 13t25-13l8-74" fill="#f5e6cb" stroke="#d2c1a3" strokeWidth="2" />
      <path d="m53 69 7 52q2 8 20 8t21-8l6-52" fill="#d29a55" />
      <path d="m53 69 7 23q20 8 43-1l4-22" fill="#e2b677" />
      <path d="m82 68 10-44 15-9" fill="none" stroke="#477147" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="80" cy="48" rx="33" ry="8" fill="#fff9e9" stroke="#d2c1a3" strokeWidth="2" />
      <rect x="62" y="60" width="17" height="15" rx="3" transform="rotate(-12 62 60)" fill="#fff8e2" opacity=".7" /><rect x="83" y="76" width="16" height="15" rx="3" transform="rotate(12 83 76)" fill="#fff8e2" opacity=".6" />
      <path d="M47 63c-17-3-23 14-13 22 12 10 26-4 13-22" fill="#e7b953" stroke="#c88f36" strokeWidth="2" /><path d="m37 67 5 12m-9-6 12-1" stroke="#fff0b1" strokeWidth="2" />
      <path d="M114 108c-12-13-1-27 13-22 2 13-4 19-13 22" fill="#6c9357" /><path d="m115 105 9-15" stroke="#b2c68c" strokeWidth="2" />
    </>}
    {type === 'snack' && <>
      <ellipse cx="80" cy="110" rx="58" ry="22" fill="#f8f4e5" stroke="#d9dfcb" strokeWidth="3" />
      <path d="m35 95 29-39 26 40q-22 16-55-1" fill="#e8b662" stroke="#bd8842" strokeWidth="2" /><path d="m43 91 19-25 18 27" fill="#f3cc87" />
      <path d="m76 101 24-39 30 37q-20 17-54 2" fill="#d99c4c" stroke="#bd8842" strokeWidth="2" /><path d="m84 96 16-24 20 25" fill="#f1c67e" />
      <path d="m53 112 29-39 26 40q-23 15-55-1" fill="#e8b662" stroke="#bd8842" strokeWidth="2" /><path d="m62 108 19-25 18 27" fill="#f3cc87" />
      <path d="m56 83 4 3m10 8 3-2m25-8 4 3m-24 15 4 2m8 7 3-2" stroke="#bc833c" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 107c-9-7-14 4-7 10 8 4 17-2 7-10m91-4c-8-7-13 3-7 8 7 4 13-2 7-8" fill="#64924c" />
    </>}
    {type === 'other' && <>
      <circle cx="80" cy="82" r="48" fill="#e2e7d7" />
      <circle cx="80" cy="78" r="48" fill="#fffdf3" stroke="#d5ddc7" strokeWidth="2" />
      <circle cx="80" cy="78" r="34" fill="#f5efdf" stroke="#e6ddc5" strokeWidth="2" />
      <circle cx="80" cy="78" r="28" fill="#fffaf0" />
      <path d="M19 43v18q0 9 8 9t8-9V43m-8 0v27m0 0v47" fill="none" stroke="#739064" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="139" cy="55" rx="10" ry="16" fill="#dce5cd" stroke="#739064" strokeWidth="3" />
      <path d="M139 72v45" stroke="#739064" strokeWidth="5" strokeLinecap="round" />
      <path d="M74 84c-13-10-5-20 5-16 10-10 21-2 15 8-5 8-13 13-20 8" fill="#d5b66f" />
      <path d="M77 64c-1-9 6-15 14-13 1 9-6 15-14 13" fill="#88a46c" />
    </>}
  </svg>
}
