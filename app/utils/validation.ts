import type { z } from 'zod'

export function makeZodValidator<TSchema extends z.ZodType>(schema: TSchema) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)
    return result.success ? undefined : result.error.issues[0]?.message
  }
}
