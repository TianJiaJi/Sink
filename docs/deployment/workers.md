# Deployment on Cloudflare Workers

1. [Fork](https://github.com/miantiao-me/Sink/fork) the repository to your GitHub account.
2. Create a [KV namespace](https://developers.cloudflare.com/kv/) (under **Storage & Databases** -> **KV**), and copy the namespace ID.
3. Create a D1 database with `pnpm wrangler d1 create sink`, and copy the returned database ID.
4. Create an [R2 bucket](https://developers.cloudflare.com/r2/) named `sink` (or run `pnpm wrangler r2 bucket create sink`). The deployment configuration always includes the `R2` binding; OpenGraph image upload and automatic backups depend on this bucket.
5. Create a project in [Cloudflare Workers](https://developers.cloudflare.com/workers/).
6. Select the `Sink` repository and use the following commands:
   - **Build command**: `pnpm build`
   - **Deploy command**: `pnpm deploy:worker`

7. In **Workers Builds** -> **Build variables and secrets**, configure variables used during build and deployment:
   - `DEPLOY_D1_DATABASE_ID` (**required**): The D1 database ID copied above.
   - `DEPLOY_KV_NAMESPACE_ID` (**required**): The KV namespace ID copied above. It is used for both the production and preview KV bindings.
   - `DEPLOY_D1_DATABASE_NAME` (_optional, default: `sink`_): The D1 database name.
   - `DEPLOY_R2_BUCKET_NAME` (_optional, default: `sink`_): The existing R2 bucket name.
   - `DEPLOY_ANALYTICS_DATASET` (_optional, default: `sink`_): The Analytics Engine dataset name.
   - `NUXT_API_CORS` (_optional, build only_): Set to `true` to enable API CORS support.
   - `NUXT_PUBLIC_*` (_build and runtime_): Add any public variables here and repeat them in the Worker's runtime variables below.

   `DEPLOY_*` variables are deployment-only and must not be added to Worker runtime variables. Do not edit the tracked `wrangler.jsonc`. The deployment command creates the gitignored `wrangler.deploy.jsonc`, applies pending D1 migrations, and then publishes the Worker.

8. Save and deploy the project.
9. After deployment, go to the Worker's **Settings** -> **Variables and Secrets** -> **Add**, and configure runtime variables separately:
   - `NUXT_PUBLIC_*`: Repeat every public variable configured for the build so it is also available at runtime.
   - `NUXT_SITE_TOKEN`: Must be at least **8** characters long. This token grants access to your dashboard.
   - `NUXT_CF_ACCOUNT_ID`: Find your [account ID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/).
   - `NUXT_CF_API_TOKEN`: Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) with at least `Account.Account Analytics` permission. [See reference.](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/#authentication)
   - (_Optional_) `NUXT_WEBHOOK_URL`: The HTTPS endpoint that enables and receives click webhooks.
   - (_Optional_) `NUXT_WEBHOOK_SECRET`: A `whsec_`-prefixed Base64 secret. Generate one with `printf 'whsec_%s\n' "$(openssl rand -base64 32)"` and store it as a secret in the dashboard. If omitted, delivery is unauthenticated and unsigned, which is not recommended over untrusted networks.

   Other `NUXT_*` values mapped to Nuxt runtime configuration, including `NUXT_DATASET`, belong here. Do not add build-only `NUXT_API_CORS` or deployment-only `DEPLOY_*` variables.

10. Enable Analytics Engine. In **Workers & Pages**, go to **Account details** in the right panel, locate **Analytics Engine**, and click **Set up** to enable the free tier. The dataset name is controlled by `DEPLOY_ANALYTICS_DATASET`; keep the runtime `NUXT_DATASET` aligned if you change the default.
11. Redeploy the project.
12. To update your code, refer to the official GitHub documentation: [Syncing a fork branch from the web UI](https://docs.github.com/pull-requests/collaborating-on-github/syncing-a-fork 'GitHub: Syncing a fork').

To optionally protect the dashboard with Cloudflare Zero Trust while keeping short links public, refer to [Cloudflare Access Authentication](../cloudflare-access.md).

Click webhook delivery is best effort and has no retries. See [Click Webhooks](../configuration.md#click-webhooks) for payload, signature, and privacy details.
