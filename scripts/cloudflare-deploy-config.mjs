import { readFile, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { parse, printParseErrorCode } from 'jsonc-parser'
import { z } from 'zod'

const rootDir = new URL('../', import.meta.url)
const sourcePath = new URL('wrangler.jsonc', rootDir)
const envPath = new URL('.env', rootDir)
const outputPath = new URL('wrangler.deploy.jsonc', rootDir)

const optionalName = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().min(1).default('sink'),
)

const deployEnvSchema = z.object({
  DEPLOY_D1_DATABASE_ID: z.string().trim().min(1),
  DEPLOY_KV_NAMESPACE_ID: z.string().trim().min(1),
  DEPLOY_D1_DATABASE_NAME: optionalName,
  DEPLOY_R2_BUCKET_NAME: optionalName,
  DEPLOY_ANALYTICS_DATASET: optionalName,
})

async function loadEnv() {
  let fileEnv = {}

  try {
    fileEnv = parseEnv(await readFile(envPath, 'utf8'))
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error
  }

  return deployEnvSchema.parse({ ...fileEnv, ...process.env })
}

function getBinding(config, section, binding) {
  const bindings = config[section]
  const match = Array.isArray(bindings)
    ? bindings.find(item => item.binding === binding)
    : undefined

  if (!match)
    throw new Error(`Missing expected ${section} binding "${binding}" in wrangler.jsonc`)

  return match
}

const source = await readFile(sourcePath, 'utf8')
const parseErrors = []
const config = parse(source, parseErrors, { allowTrailingComma: true })

if (parseErrors.length > 0) {
  const details = parseErrors
    .map(error => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
    .join(', ')
  throw new Error(`Failed to parse wrangler.jsonc: ${details}`)
}

const env = await loadEnv()
const d1 = getBinding(config, 'd1_databases', 'DB')
const kv = getBinding(config, 'kv_namespaces', 'KV')
const r2 = getBinding(config, 'r2_buckets', 'R2')
const analytics = getBinding(config, 'analytics_engine_datasets', 'ANALYTICS')

d1.database_id = env.DEPLOY_D1_DATABASE_ID
d1.database_name = env.DEPLOY_D1_DATABASE_NAME
kv.id = env.DEPLOY_KV_NAMESPACE_ID
kv.preview_id = env.DEPLOY_KV_NAMESPACE_ID
r2.bucket_name = env.DEPLOY_R2_BUCKET_NAME
r2.preview_bucket_name = env.DEPLOY_R2_BUCKET_NAME
analytics.dataset = env.DEPLOY_ANALYTICS_DATASET

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
