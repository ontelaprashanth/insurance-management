# InsureX frontend (React + Vite)

Customer portal and admin console for the InsureX Spring Boot backend.

## Run
```bash
npm install
cp .env.example .env     # set VITE_API_URL if your API is not on http://localhost:8080
npm run dev              # http://localhost:5173 (already allowed by your CORS config)
npm run build            # production build in dist/
```

## Screens
- Public: landing with live premium dial, sign in (username, email or mobile), register, forgot password (OTP).
- Customer (`/app`): dashboard, buy insurance (cover, nominee, Razorpay checkout), my policies, payments and refund status, claims (file and track), reviews, notifications, profile and password.
- Admin (`/admin`): dashboard, users, policy holders, policies, purchases, claims (approve or reject, then create settlement), settlements (create, edit, process, delete), reviews (reply), broadcast notifications.

## Things to know about the backend
- Login returns only a JWT. The app then calls `GET /api/session` to learn the role.
- A customer needs a **policy holder profile** (created by an admin) before they can buy a policy or file a claim.
- The premium on screen mirrors `PolicyPurchaseService` (per-plan yearly rate × cover ÷ ₹10 L × years, 5% off for 2+ years, 0% GST). If you change rates on the server, update `src/lib/premium.js`.
- `POST /policy/purchase` verifies the Razorpay signature itself, so the app does not call `/payment/verify` separately.
- There is no refund endpoint in the API. The app shows refund status and the 24-hour window but has no refund button.
- Settlement endpoints are admin-only, so customers learn about payouts through notifications and the claim status.
