# Deployment (Vercel + MongoDB Atlas)

## Required environment variables
Set these in Vercel (Project Settings -> Environment Variables). See `.env.example`.

- `MONGODB_URI` - MongoDB Atlas connection string (allow Vercel IPs in Atlas network access)
- `JWT_SECRET` - long random string for signing sessions
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - outgoing mail
- `NEXT_PUBLIC_APP_URL` - public base URL of the deployment
- `CRON_SECRET` - random string (16+ chars); Vercel sends it as `Authorization: Bearer <CRON_SECRET>` to cron invocations. Requests without it get 401.

## Scheduled email cron
`vercel.json` defines a cron calling `GET /api/cron/process-scheduled` (processes up to 25 due emails per run).

Default schedule is `0 8 * * *` (daily, 08:00 UTC) because **Hobby plans only allow crons that run once per day** (timing may drift within the hour); a more frequent expression makes Hobby deployments fail.

Scheduled emails therefore go out at most once per day on Hobby. Options:
- **Pro/Enterprise:** change the schedule to `*/5 * * * *`.
- **Hobby:** use an external scheduler (e.g. cron-job.org, GitHub Actions) to call the endpoint every few minutes with header `Authorization: Bearer <CRON_SECRET>` (GET or POST).

Manual test: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/process-scheduled`
