# SmartCart — E-commerce platform

SmartCart is an existing React/Vite + Django REST Framework application with customer, seller, and administrator roles. This update preserves the existing application and adds INR-first storefront styling, coupons, saved shipping addresses, Razorpay integration structure, and seller notifications.

## Existing functionality retained

- Customer/seller registration, email OTP login, JWT access/refresh tokens, logout blacklisting, and password recovery.
- Role-protected customer and seller routes.
- Public product/category APIs, seller-owned product CRUD, inventory controls, server-backed cart and wishlist.
- Order history and seller order status lifecycle.

## Features added/updated

- SmartCart branding across user-facing source, emails, navigation, footer, and browser title.
- Redesigned landing page with responsive lifestyle imagery, category section, live catalog products, loading states, and responsive layout.
- Shared `Intl.NumberFormat('en-IN', { currency: 'INR' })` formatting. New demo product prices are INR; existing database prices are deliberately not converted automatically.
- Coupon model/API with percentage/fixed discounts, expiry, minimum subtotal, global usage cap, active state, seller ownership, backend validation, and checkout recalculation. Seller coupon manager is available at `/seller/coupons`; administrators can also manage coupons in Django admin.
- Responsive shipping checkout with address validation, order summary, optional delivery instructions, saved addresses, and server-side totals.
- Razorpay payment order creation and signature verification endpoints. Online payments remain in pending/failed states until verified by the backend.
- Seller in-app notifications for new orders, verified payments, and low stock, with seller-scoped read state and optional Web Push delivery.
- Existing Remember Me behavior is preserved: tokens are placed in local storage when selected and session storage otherwise. This uses the existing frontend JWT architecture; it is not an HttpOnly-cookie architecture.
- Development seed command creates sample products with INR prices and image URLs plus the `SMART10` demo coupon.

## Project structure

- `backend/users/`: authentication, email OTP, password recovery, role permissions.
- `backend/catalog/`: categories, product catalog, seller product CRUD, seed command.
- `backend/shop/`: cart, wishlist, orders, coupons, saved addresses, payments, seller notifications.
- `frontend/src/pages/`: landing, authentication, customer shopping, seller management.
- `frontend/src/services/shop.js`: frontend API clients.
- `frontend/public/sw.js`: browser push service worker.

## Backend setup

Use the existing environment and preserve your real `.env`. Do not overwrite it with `.env.example`. Example local settings are in `backend/.env.example`; they are placeholders only. For the MySQL setup previously used for this project, the database URL may look like:

```env
DATABASE_URL=mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3307/ecom_db
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

From `ecom/backend` with your virtual environment activated:

```powershell
pip install -r requirements.txt
python manage.py check
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Back up the database before migrations. `0002_commerce_features.py` adds checkout/payment fields and creates coupon, address, notification, and push-subscription tables without deleting existing rows. The demo seed command only runs with `DEBUG=True`; it creates demo accounts with password `Demo@12345!`, so use only in a disposable local database and change/delete those accounts before any shared deployment. Existing product records are not rewritten by the seeder.

## Frontend setup

From `ecom/frontend` in another terminal:

```powershell
npm ci
npm run dev
```

The Vite server defaults to `http://localhost:5173`. `VITE_API_URL` defaults to `http://localhost:8000/api`.

## Razorpay test configuration

Install dependencies using `requirements.txt`, then configure in `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Use Razorpay test credentials from your Razorpay dashboard. The public key ID is returned to the authenticated customer client; the secret stays on the backend. Checkout creates a server-side Razorpay order from the persisted order total. `POST /api/payments/razorpay/<order_id>/verify/` verifies the Razorpay HMAC signature before marking the order paid. Never treat a frontend success callback by itself as payment confirmation. A webhook endpoint is not included in this version, so production deployments should add and configure signed webhooks and gateway-side reconciliation before relying on unattended payment reconciliation. Real payment processing cannot be verified without valid Razorpay test credentials and gateway access.

## Seller browser push configuration

In `backend/.env`, configure a VAPID key pair:

```env
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_CLAIMS_EMAIL=mailto:support@smartcart.example
```

In `frontend/.env`, set the matching public key:

```env
VITE_VAPID_PUBLIC_KEY=your_matching_vapid_public_key
```

Restart Vite after changing frontend environment variables. Sellers can select **Enable browser push** from the in-app notification panel. The browser must support Push API/Service Worker and the seller must grant permission. In-app notifications work as a fallback. If the push dependency or keys are missing, browser push delivery is not enabled.

## API endpoints added

- `POST /api/coupons/apply/` — validate a code against the authenticated customer's cart and calculate the discount.
- `/api/seller/coupons/` — seller-owned coupon CRUD; administrators can manage through Django admin as well.
- `/api/shipping-addresses/` and `/api/shipping-addresses/<id>/` — current customer's saved addresses, scoped by ownership.
- `POST /api/payments/razorpay/<order_id>/create/` — create/retrieve gateway order using server-computed total.
- `POST /api/payments/razorpay/<order_id>/verify/` — server-side signature verification.
- `POST /api/payments/razorpay/<order_id>/failure/` — record unsuccessful attempt so checkout can be retried.
- `GET /api/seller/notifications/`, `PATCH /api/seller/notifications/<id>/read/`, and `/api/seller/push-subscription/` — seller-scoped notification APIs.

## Currency/data note

The UI now formats money as INR, and newly seeded sample prices are rupee values. This update does **not** blindly convert existing product/order values, because the currency of historic numeric values cannot be inferred safely. Audit existing database values before using them as production INR prices. Order totals and discounts are recalculated on the backend; the client does not submit a trusted total.

## Testing status and limitations

- Python source compilation was checked.
- A complete Django test run and MySQL migration run require installing the backend dependencies and connecting to your local database; these were not available in this build environment.
- Frontend production build was attempted but could not run because the uploaded Windows `node_modules` did not contain the Linux Rollup optional binary. Run `npm ci` on your development machine to install platform-correct dependencies and then `npm run build`.
- Razorpay success/failure flows require Razorpay test credentials. Browser push requires matching VAPID keys, supported browser permissions, and working HTTPS outside localhost.
- Product image URLs use remote Unsplash assets; verify image availability and licensing for your production deployment.
- Existing JWT persistence is retained. Since it uses local/session storage, it does not provide the XSS protection of HttpOnly cookies; consider a backend cookie-based token architecture for a production security hardening pass.
