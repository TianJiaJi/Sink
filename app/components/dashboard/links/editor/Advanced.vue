<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { today } from '@internationalized/date'
import { CalendarIcon, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  form: {
    Field: any
    getFieldValue: (name: string) => any
    setFieldValue: (name: string, value: any) => void
  }
  validateOptionalUrl: (ctx: { value: string }) => string | undefined
  validateComment: (ctx: { value: string }) => string | undefined
  isInvalid: (field: any) => boolean
  getAriaInvalid: (field: any) => string | undefined
  formatErrors: (errors: unknown[]) => string[]
  currentSlug: string
}>()

const advancedOpen = ref(false)
const datePickerOpen = ref(false)
</script>

<template>
  <Collapsible v-model:open="advancedOpen" class="space-y-2">
    <CollapsibleTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        class="
          flex w-full justify-between px-0
          hover:bg-transparent
        "
      >
        <span class="font-medium">{{ $t('links.form.more_options') }}</span>
        <ChevronDown
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': advancedOpen }"
        />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent class="space-y-6 pt-2">
      <!-- Device Redirect -->
      <div class="space-y-4">
        <h4 class="text-sm font-medium text-muted-foreground">
          {{ $t('links.form.device_redirect') }}
        </h4>
        <FieldGroup>
          <!-- Google Play URL -->
          <props.form.Field
            v-slot="{ field }"
            name="google"
            :validators="{ onBlur: validateOptionalUrl }"
          >
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.google_play') }}
              </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :aria-invalid="getAriaInvalid(field)"
                placeholder="https://play.google.com/store/apps/..."
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>

          <!-- App Store URL -->
          <props.form.Field
            v-slot="{ field }"
            name="apple"
            :validators="{ onBlur: validateOptionalUrl }"
          >
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.app_store') }}
              </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :aria-invalid="getAriaInvalid(field)"
                placeholder="https://apps.apple.com/app/..."
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </div>

      <Separator />

      <!-- OpenGraph Settings -->
      <div class="space-y-4">
        <h4 class="text-sm font-medium text-muted-foreground">
          {{ $t('links.form.og_settings') }}
        </h4>
        <FieldGroup>
          <!-- Title -->
          <props.form.Field v-slot="{ field }" name="title">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_title') }}
              </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.og_title_placeholder')"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>

          <!-- Description -->
          <props.form.Field v-slot="{ field }" name="description">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_description') }}
              </FieldLabel>
              <Textarea
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.og_description_placeholder')"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLTextAreaElement).value)"
              />
            </Field>
          </props.form.Field>

          <!-- Image -->
          <props.form.Field v-slot="{ field }" name="image">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_image') }}
              </FieldLabel>
              <DashboardLinksImageUploader
                :model-value="field.state.value"
                :slug="currentSlug"
                @update:model-value="field.handleChange($event || '')"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </div>

      <Separator />

      <!-- Advanced Settings -->
      <div class="space-y-4">
        <h4 class="text-sm font-medium text-muted-foreground">
          {{ $t('links.form.advanced') }}
        </h4>
        <FieldGroup>
          <!-- Comment Field -->
          <props.form.Field
            v-slot="{ field }"
            name="comment"
            :validators="{ onBlur: validateComment }"
          >
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.comment') }}
              </FieldLabel>
              <Textarea
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :aria-invalid="getAriaInvalid(field)"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLTextAreaElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>

          <!-- Expiration Date Picker -->
          <props.form.Field v-slot="{ field }" name="expiration">
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.expiration') }}
              </FieldLabel>
              <Popover v-model:open="datePickerOpen">
                <PopoverTrigger as-child>
                  <Button
                    :id="field.name"
                    variant="outline"
                    :class="cn(
                      'w-full justify-start text-left font-normal',
                      !field.state.value && 'text-muted-foreground',
                    )"
                  >
                    <CalendarIcon class="mr-2 h-4 w-4" />
                    {{
                      field.state.value
                        ? field.state.value.toDate(getTimeZone()).toLocaleDateString()
                        : $t('links.form.pick_date')
                    }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <Calendar
                    :model-value="field.state.value"
                    :default-placeholder="today(getTimeZone())"
                    layout="month-and-year"
                    initial-focus
                    @update:model-value="(v: DateValue | undefined) => {
                      field.handleChange(v)
                      datePickerOpen = false
                    }"
                  />
                </PopoverContent>
              </Popover>
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
