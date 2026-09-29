import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { z } from 'zod'

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Request validation failed',
        issues: result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      })
    }
    return result.data
  }
}
