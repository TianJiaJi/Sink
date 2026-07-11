# Deployment on Cloudflare Pages

1. [Fork](https://github.com/miantiao-me/Sink/fork) the repository to your GitHub account.
2. Create a project in [Cloudflare Pages](https://developers.cloudflare.com/pages/).
3. Select the `Sink` repository and choose the `Nuxt.js` preset.
4. Configure environment variables according to when they are used:
   - **Build only**: Set `NUXT_API_CORS=true` only if API CORS support is needed.
   - **Build and runtime**: Configure `NUXT_PUBLIC_*` variables for both phases.
   - **Runtime**: Configure the remaining `NUXT_*` variables mapped to Nuxt runtime configuration. These include `NUXT_SITE_TOKEN`, `NUXT_CF_ACCOUNT_ID`, `NUXT_CF_API_TOKEN`, `NUXT_DATASET`, `NUXT_WEBHOOK_URL`, and `NUXT_WEBHOOK_SECRET`.

   `NUXT_SITE_TOKEN` must be at least **8** characters long. Create `NUXT_CF_API_TOKEN` with at least `Account.Account Analytics` permission. [See reference.](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/#authentication)

5. Save and deploy the project.
6. Cancel the deployment, then go to **Settings** -> **Bindings** -> **Add**:
   - **KV Namespace**: Bind the variable name `KV` to a [KV namespace](https://developers.cloudflare.com/kv/) (create a new one under **Storage & Databases** -> **KV**).
   - **D1 Database**: Create a D1 database named `sink`, bind it with the variable name `DB`, and copy its database ID for the migration step below.
   - **Workers AI** (_Optional_): Bind the variable name `AI` to the Workers AI Catalog.
   - **R2 Bucket**: Create an R2 bucket under **Storage & Databases** -> **R2**, then bind the variable name `R2` to the bucket. OpenGraph image upload and automatic backups depend on it.
   - **Analytics Engine**:
     - In **Workers & Pages**, go to **Account details** in the right panel, locate `Analytics Engine`, and click `Set up` to enable the free tier.
     - Return to **Settings** -> **Bindings** -> **Add** and select **Analytics engine**.
     - Bind the variable name `ANALYTICS` to the `sink` dataset.

7. From a local checkout authenticated with Wrangler, add the following deployment variables to `.env`, then apply the database schema with `pnpm db:migrate:remote`:

   ```dotenv
   DEPLOY_D1_DATABASE_ID=your-d1-database-id
   DEPLOY_KV_NAMESPACE_ID=your-kv-namespace-id
   ```

   Although Pages bindings are managed in the dashboard, the migration script uses these values to generate `wrangler.deploy.jsonc`. Run the migration command before each deployment that includes new migrations. `DEPLOY_D1_DATABASE_NAME`, `DEPLOY_R2_BUCKET_NAME`, and `DEPLOY_ANALYTICS_DATASET` are optional and default to `sink`. `DEPLOY_R2_BUCKET_NAME` must identify an existing bucket. Do not edit the tracked `wrangler.jsonc`.

   `DEPLOY_*` variables are deployment-only. They are used by `deploy:config`, local remote migrations, and CLI deployments, and must not be uploaded as Pages/Worker runtime variables.

8. Add Compatibility flags:
   - Go to **Settings** -> **Runtime** -> **Compatibility flags** and add `nodejs_compat`.
9. Redeploy the project.
10. To update code, refer to the official GitHub documentation [Syncing a fork branch from the web UI](https://docs.github.com/pull-requests/collaborating-on-github/syncing-a-fork 'GitHub: Syncing a fork').

To optionally protect the dashboard with Cloudflare Zero Trust while keeping short links public, refer to [Cloudflare Access Authentication](../cloudflare-access.md).

Click webhook delivery is best effort and has no retries. See [Click Webhooks](../configuration.md#click-webhooks) for payload, signature, and privacy details.
