# The Wild Tree website

A separate restaurant design built on the same business-site architecture as The Rib Crib.

- `WildTreePage.tsx`: restaurant shell, scoped meal state, enquiry form, visit details and dialogs.
- `WildTreeHero.tsx` and `WildTreeExperience.tsx`: supplied artwork, editorial restaurant presentation.
- `WildTreeMenu.tsx`: all 51 menu items, alias search, categories, provenance filter and progressive loading.
- `WildTreeMealPlanner.tsx`: quantities, removals, sample plan and fictional subtotal.
- `WildTreeConcierge.tsx`: copyable enquiry drafts plus the shared restaurant chat integration behind an explicit disabled-runtime setting.
- `WildTreeDialog.tsx`: native accessible artwork/detail dialog.
- `Photo.tsx`: accessible image-error fallback.
- `WildTreePage.module.css`: only this restaurant's visual styles and responsive layouts.

Run `npm run dev` from frontend and visit `/preview/the-wild-tree`.
The preview route is development-only and noindex. Production routing still uses
`app/[vertical]/[business]` and Supabase; a renderer registry entry does not publish
a new route or activate a preset.

The actual runtime preset is still a hidden draft. Live chat is therefore disabled,
not impersonated with canned AI replies. Enquiries can be prepared and copied;
nothing is sent, booked, charged or dispatched. Do not enable the shared chat until
the correct server preset and isolation checks have been configured and verified.

All prices are fictional, and 34 entries are invented concepts. The 17 source-backed
names retain their own supplied artwork. The new interior/table images are supplied
concept artwork and are labelled as illustrative. Never substitute Rib Crib images,
menu data or visual styles in this package.
