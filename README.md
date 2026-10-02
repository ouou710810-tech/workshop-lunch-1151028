# 非專研習・捕夢網製作點餐網站

GitHub Pages static-site draft for the 2026-10-28 workshop.

## Current state

- The participant page and supplied menu image are in place.
- The two supplied seaweed-roll photos are used in the hero and introduction sections.
- Orders are stored in the Supabase project `workshop-lunch-1151028` (Tokyo region).
- Everyone sees the same masked order list and meal totals; the organizer page requires the organizer email login to show full names and download CSV.
- The Edge Function is `lunch-orders`. The SQL table is not directly exposed to browser clients; it has RLS enabled and only the function's service role can query it.

## Menu

原味飯糰、海苔香鬆、泡菜飯糰、鮪魚飯糰、烤肉飯糰、辣豬肉飯糰。

The source menu image is `assets/menu.png`; its six round cross-sections are cropped as transparent circular PNGs in `assets/meal-circle-1.png` through `assets/meal-circle-6.png`.
The supplied food photos are `assets/seaweed-roll-platter.png` and `assets/seaweed-roll-wrapped.png`.

## GitHub Pages and organizer access

GitHub Pages serves the static participant site. The PNG card is generated in the browser and the QR code points to the deployed page URL. Shared order storage and validation are handled by the Supabase Edge Function.

The private organizer page is `/admin/`. Its passwordless sign-in is restricted server-side to the organizer email configured as a salted hash in a private database table. In Supabase Auth URL Configuration, add this exact Redirect URL so email sign-in returns to the manager page:

`https://ouou710810-tech.github.io/workshop-lunch-1151028/admin/`

The Supabase project URL and publishable key in `backend-config.js` are intended for public browser use. Never put a Supabase secret or service-role key in this repository.
