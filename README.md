# RockVent — Construction Product Catalog (Railway)

An independent, mobile-friendly B2B construction catalog with a simple product manager, image uploads, CSV import, and multi-product sales quote requests. No Lovable, Squarespace website subscription, or React build step required.

## Features

- Elegant, mobile-first product catalog; search by name, description, category or product ID; category filters.
- Product-specific **Ask about this** action (opens quote drawer with that product preselected).
- **Add to quote** builds a quote list of multiple products, with quantities and project notes.
- Quote submission sends **one email to your sales team containing the exact product codes, names, quantities, contact details and message**, using Resend once configured.
- Without email configuration, customers can use **Open request in email app** as a fallback, which creates a properly labeled email to your sales address.
- `/admin.html`: password-protected product management, with photo uploads, product editing/deleting, and bulk CSV import. Sample products are placeholders.
- Data stored in `DATA_DIR/catalog.json` and images in `DATA_DIR/uploads/`. All customer-facing catalog data comes from this store.

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
# Load environment variables from .env using your shell or `node --env-file=.env server.js`
node --env-file=.env server.js
```

Visit `http://localhost:3000/` and `http://localhost:3000/admin.html`.

## Deploy to Railway

1. Upload this project to a GitHub repository (the contents of this folder should be at the repository root).
2. Railway → **New Project** → **Deploy from GitHub Repo** → select the repository. Railway builds the included Dockerfile automatically.
3. In Railway **Variables**, configure:
   - `ADMIN_USER` (e.g. `admin`)
   - `ADMIN_PASSWORD` (a unique, long password)
   - `SESSION_SECRET` (a long random secret; use at least 32 random bytes)
   - `BUSINESS_NAME` (your company name)
   - `SALES_EMAIL=sales@rockventuae.com`
   - `DATA_DIR=/app/data`
   - `RESEND_API_KEY` and `MAIL_FROM` (for automated inquiry emails; see below)
4. **Before uploading products**, add a **Railway Volume** mounted at `/app/data`. The Docker image does not preserve runtime writes across deployments. Volume storage is crucial to retain both product changes and uploaded photographs. Use **one service replica** with this file-based catalog.
5. In Railway's service settings, enable the public domain under **Networking**. Open the URL; use `/admin.html` to upload products.
6. Connect your existing business domain through Railway's custom-domain settings. In Squarespace Domains, set only the records Railway gives you; keep Google Workspace MX, SPF and DKIM records intact.
7. Enable Resend sending before publicly promoting the inquiry form.

**Pricing:** Railway is not guaranteed free indefinitely; hosting, volumes, usage, and sending service may be chargeable. Check current Railway and Resend prices. GitHub hosting of source code is separate from the production site.

## Configure email delivery

This version uses Resend's API and requires a verified sender domain. Sign up at https://resend.com, verify your sending domain, then set:

```env
SALES_EMAIL=sales@rockventuae.com
RESEND_API_KEY=re_...
MAIL_FROM=Quotes <quotes@your-verified-domain.com>
```

The `MAIL_FROM` domain must be verified in Resend. This does **not** replace or disable Google Workspace email. You can typically configure Resend DKIM/SPF records alongside Google Workspace DNS, but follow Resend's instructions carefully; do not create multiple conflicting SPF TXT records for the same hostname. Inquiries will appear in the Workspace inbox linked to `SALES_EMAIL`; replies go to the customer's email. **Until this is configured, the Send Inquiry button returns a clear error and the mailto link remains available.** No submission is falsely presented as sent.

## Add products

- Navigate to `/admin.html` and sign in.
- Add a unique product code (SKU), name, category, description, and product photograph. The image is resized and converted to WebP automatically.
- Existing products can be edited or removed; the website refreshes product data on each load.
- For bulk uploads, click **Download CSV template** in the admin. Add rows and import the CSV. Keep `id` unique; imports with existing IDs update the matching products.
- Image URLs in CSV should be publicly accessible HTTPS image URLs. To upload local photos, use the product edit form.

## Operational notes

- Products are stored as a single JSON file and served from one Railway replica. This is suitable for an initial small business catalog. For a larger team, multi-instance production workload, or frequent edits, migrate to managed Postgres + object storage.
- Admin authentication uses an 8-hour cookie session with a strong configured secret. Sessions are kept in server memory, so a deployment logs you out. Set Railway HTTPS (custom domain or Railway domain) before using admin credentials.
- Back up the `/app/data` Railway volume periodically. Exports in admin back up the catalog metadata; also back up uploaded image files.
- Add a CAPTCHA/bot protection and more persistent rate limiting if you attract high traffic or form spam. The app uses a simple IP-based rate limiter and an invisible honeypot.
- Sample products and photography are placeholders, not claims that items are in stock. Replace them with actual offerings before launching.
- Changing an existing product ID can break an old visitor's saved quote list; use stable product IDs.


## New catalog capabilities (v3)
- **Multiple images:** open `/admin.html`, edit a product, upload multiple additional images; remove old images using the remove controls. Product detail view displays the gallery.
- **Technical specifications:** upload PDF documents for each product (up to 15 MB each). Links appear in product details.
- **Minimum order quantities:** define `minOrder` and `unit` for each product. Quote cart initializes quantity at minimum and enforces that minimum on edits and server submissions.
- **CSV imports:** optional `minOrder` and `unit` columns are supported. For multi-image galleries and PDFs, use the admin editor after import.
- **Persistent storage:** Railway volume MUST be mounted at `/app/data`; images, documents, and catalog JSON all live there.
- **Note:** Admin authentication is basic single-user authentication and sessions use in-memory storage. For a production site, consider persistent session storage, CSRF mitigation, admin access restrictions, automated backups, and malware scanning of PDF uploads. For uploaded assets, backups are essential because a Railway volume is not itself a backup.


## RockVent branding / enquiries (V4)
- Home: `/`; About Us: `/about.html`; Admin: `/admin.html`
- Public emails: `info@rockventuae.com` and `sales@rockventuae.com`.
- Quote submissions on the server are addressed to `sales@rockventuae.com`.
- **To enable actual automatic email delivery**, configure `RESEND_API_KEY` and `MAIL_FROM` in Railway; verify your domain/sender in Resend and add its required DNS records without overwriting Google Workspace MX/SPF/DKIM. Without Resend the online send action gives an error, but the email-app fallback opens a pre-addressed message.
- `BUSINESS_NAME=RockVent` and `SALES_EMAIL=sales@rockventuae.com` are suggested Railway variables.
- About Us is neutral placeholder copy; replace with verified company facts.
- Ensure `about.html` is in the repository root alongside index.html and the updated Dockerfile.
