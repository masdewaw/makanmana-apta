# MakanMana UI refresh

Implemented locally on 6 November 2026 from the three user-supplied visual references. No publishing, backend/schema edits, dependency installation, or PWA changes in this pass.

## Direction

- Reference 1: quiet whitespace, clear hierarchy, simple navigation and checkout.
- Reference 2: friendly greeting, category rail and horizontal menu cards.
- Reference 3: green accents, warm backgrounds, food illustrations and quantity controls.
- The app remains a maximum 430 px wide, including on desktop.
- Five reusable inline SVG illustrations: meal, noodle/soup bowl, drink, snack, and miscellaneous. Food names/categories select an illustration; these are category placeholders, not photos or promises about the actual dish.

## Implementation

`PersonalMenu` contains the customer menu presentation. Fetching, cart persistence, checkout IDs, authentication and authorization stay in their existing owners. Shared theme tokens update supporting screens, drawers, login, orders and OB tools. The customer navigation provides Beranda, Favorit, Pesanan and Akun. Existing Teman Makan, Patungan, manual orders, Tardut, ranking and tracking remain accessible.

Drawers retain keyboard viewport handling and safe-area support. The shared close action is now explicit. Vaul's decorative `::after` extension is hidden because it inflated the outer scrollable area by 200%, exposing blank space and allowing the header/footer to scroll away.

## Preview and validation

`scratch/design-preview.html` is a local development entry using real redesigned components and simulated menus. It is not imported by the production app and sends no orders. Start Vite and visit `/scratch/design-preview.html`; use `?screen=auth` for the login design.

Browser checks completed at 390 × 844 and 320 × 568: search, favorites, adding a menu, cart presentation, payment choice, note entry, drawer close, horizontal overflow, and checkout button bounds. Desktop 1200 px check confirmed the app width stays 430 px. The small-screen drawer height was 552 px with the submit button inside the 568 px viewport; no page horizontal overflow was measured. These are desktop browser viewport checks, not real iOS/Android keyboard tests.

All six existing automated regression scripts and TypeScript/build checks pass. Live authentication, real order submission, actual mobile keyboard behavior and OB workflows still need device QA before release. Screenshots use simulated data and do not prove backend integration.

## Desktop drawer alignment fix

The shared drawer measures the app canvas rather than assuming the full viewport center. It watches shell resizing and body/html scroll-lock style changes, so classic desktop scrollbar compensation does not offset the modal. Observers attach only while the portal content exists, and Vaul retains vertical/keyboard transforms. Browser measurements: at 1200 px, app and drawer both start at x=377.5 with width 430; at 320 px with a classic scrollbar, both have width 305 and zero horizontal offset. Screenshot captured using the local simulated cart.
