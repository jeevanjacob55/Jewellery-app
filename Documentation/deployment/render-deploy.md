For this repo, if you’re creating the Render web service manually, use these values:

Render Web Service

Environment: Python 3
Root Directory: backend
Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput
Start Command: python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
Health Check Path: /api/health/
Other good choices

Plan: Starter is fine for preview
Auto-Deploy: Yes
Branch: your working branch, usually main
Region: pick the closest one to your users/client
Important
Set Root Directory to backend. If you leave it blank, Render will run from the repo root and requirements.txt will not be found correctly.

Env vars to add
At minimum:

DEBUG=False
SECRET_KEY=<generate a strong secret>
ALLOWED_HOSTS=your-render-domain.onrender.com,preview-api.yourdomain.com
CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://admin.yourdomain.com
DATABASE_URL=<from Render Postgres>
MEDIA_STORAGE_PROVIDER=r2
MEDIA_PUBLIC_BUCKET_NAME=<your public bucket>
MEDIA_PRIVATE_BUCKET_NAME=<your private bucket>
MEDIA_PUBLIC_BASE_URL=<your public R2 URL>
R2_ACCOUNT_ID=<your cloudflare account id>
R2_ACCESS_KEY_ID=<your access key>
R2_SECRET_ACCESS_KEY=<your secret key>
R2_REGION=auto
If you want, I can give you the exact next screen-by-screen Render setup in order so you can just copy it.
Set those in **Render**, not just locally.

For your live backend at `https://jewellery-app-n0tm.onrender.com`, add these in the Render web service environment variables:

- `ALLOWED_HOSTS=jewellery-app-n0tm.onrender.com`
- `RENDER_EXTERNAL_HOSTNAME=jewellery-app-n0tm.onrender.com`

Why:
- Render runs the deployed Django app with its own environment.
- Your local `backend/.env` only affects your local machine.

You can also put them in local `backend/.env` if you want your local config to mirror production, but that does **not** configure the live Render app.

So the short answer is:
- **Required:** set them in Render
- **Optional:** also set them locally for consistency

Also, if you later add a custom domain, update `ALLOWED_HOSTS` to include both, for example:
- `ALLOWED_HOSTS=jewellery-app-n0tm.onrender.com,api.yourdomain.com`

And usually:
- `RENDER_EXTERNAL_HOSTNAME=jewellery-app-n0tm.onrender.com`

If you want, I can give you the exact full Render env var list you should enter now for this deployed backend.