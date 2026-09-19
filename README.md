# Jourvis

**Business Automation**

Privacy policy, data deletion instructions and support information for Jourvis, operated by **Jour**.

Support: **jourdesepalacio@gmail.com**

Command Center V2 is a Next.js application at the repository root. Its owner workspace, supplier portal and Marinara QR menu use Supabase as their source of truth. See [setup, architecture and rollback](docs/COMMAND-CENTER-V2.md) and [n8n sign-in email setup](docs/AUTH-EMAIL-N8N.md).

The previous [React frontend](frontend/README.md) remains in `frontend/`. The root build preserves its existing public routes and animations as static pages; its Command Center remains available at `/command-center-v1`. The redesigned Marinara page is `/restaurant/marinara-ristorante`.

Vercel's Jourvis project uses the repository root and the checked-in `vercel.json`. Production is deployed manually by the owner after review; Git auto-deployment is disabled. No deployment is triggered by this feature branch. Existing policy content remains available.

Policy content reflects the current service: requests are handled manually, AI providers may process messages, and no fixed automatic deletion schedule is promised.
