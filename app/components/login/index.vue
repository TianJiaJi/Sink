<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const { t } = useI18n()
const { previewMode } = useRuntimeConfig().public
const { setToken, removeToken } = useAuthToken()

const token = shallowRef('')
const error = shallowRef('')

const LoginSchema = z.object({
  token: z.string().min(1),
})

async function handleSubmit() {
  error.value = ''
  const result = LoginSchema.safeParse({ token: token.value })

  if (!result.success) {
    error.value = t('login.token_required')
    return
  }

  try {
    setToken(token.value)
    await useAPI('/api/verify')
    navigateTo('/dashboard')
  }
  catch (e) {
    removeToken()
    console.error(e)
    toast.error(t('login.failed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>
        <h1 class="text-2xl font-medium text-balance">
          {{ $t('login.title') }}
        </h1>
      </CardTitle>
      <CardDescription>
        {{ $t('login.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <Input
          type="text"
          name="username"
          autocomplete="username"
          value="root"
          readonly
          class="sr-only size-px min-h-px min-w-px p-0"
          tabindex="-1"
          aria-hidden="true"
        />
        <FieldGroup>
          <Field :data-invalid="!!error">
            <FieldLabel for="token">
              {{ $t('login.token_label') }}
            </FieldLabel>
            <Input
              id="token"
              v-model="token"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="********"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'token-error' : undefined"
              autocapitalize="none"
              spellcheck="false"
            />
            <FieldError v-if="error" id="token-error" :errors="[error]" />
          </Field>
        </FieldGroup>

        <Alert v-if="previewMode">
          <AlertCircle aria-hidden="true" class="size-4" />
          <AlertTitle>{{ $t('login.tips') }}</AlertTitle>
          <AlertDescription>
            {{ $t('login.preview_token') }}
            <code
              class="
                rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground
              "
            >SinkCool</code>
          </AlertDescription>
        </Alert>

        <Button
          class="
            min-h-11 w-full
            lg:min-h-9
          " type="submit"
        >
          {{ $t('login.submit') }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
