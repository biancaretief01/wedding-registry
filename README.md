# Bianca & Ruben — Wedding Registry Starter

This folder is designed to live at:

`mrandmrsmarx.co.za/registry/`

It deliberately inherits the visual language of the current invitation site: Cormorant Garamond, `#fcfbf9` paper, `#302e2b` ink, fine rules, soft neutral/sage sections and large editorial imagery.

## Files
- `index.html` — guest-facing registry
- `styles.css` — responsive editorial styling
- `app.js` — filtering, gift details, reservation modal, Supabase connection, realtime refresh
- `supabase.sql` — tables, privacy rules and race-condition-safe reservation function

## 1. Put it into your existing site
Create this folder beside your current invitation files:

```
/registry
  index.html
  styles.css
  app.js
```

The starter currently expects your existing wedding hero image at `../images/hero.jpg`. Replace that with a dedicated registry hero later if you want.

## 2. Create Supabase backend
1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase.sql`.
4. In Project Settings > API, copy Project URL and anon/public key.
5. Paste those two values at the top of `app.js`.

Until you do this, the website intentionally runs in DEMO MODE with sample gifts so you can design/test the page immediately.

## 3. Privacy model
- Public visitors can read visible gift data.
- Public visitors cannot read the reservations table.
- Guest name/contact details therefore do not appear on the public site.
- Public reservations are submitted only through `reserve_gift()`.
- The SQL function locks the relevant gift row before reserving it, preventing two guests from claiming the same last available unit.

## 4. Live updates
`app.js` subscribes to changes on the `gifts` table. When one guest reserves a gift, other open registry pages refresh the availability automatically.

## 5. Images
For production, add your own product/mood-board images rather than hotlinking retailer images unless their usage terms allow it. Store hosted image URLs in `gifts.image_url`.

## Next build phase
- Private `/registry/admin/` dashboard
- Add/edit/delete gifts
- Upload product + mood-board images
- Brand manager
- Reservation list visible only to Bianca/Ruben
- Release/cancel reservation links
- Email confirmation workflow
- Registry link integrated into the existing invitation site's Gifts section
