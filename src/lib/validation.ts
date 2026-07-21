import { z } from 'zod'

const nullableUrl = z
  .string()
  .trim()
  .url('올바른 URL 형식이 아닙니다.')
  .nullable()
  .or(z.literal('').transform(() => null))

const nullableText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .or(z.literal('').transform(() => null))

export const environmentSchema = z.enum(['dev', 'stg', 'prd'])
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'review_requested', 'done', 'rejected'])

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요.'),
  description: nullableText,
  assigneeId: z.string().trim().min(1, '담당자를 선택해주세요.'),
  environment: environmentSchema,
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다.')
    .nullable()
    .or(z.literal('').transform(() => null)),
  isBlocking: z.boolean(),
  confluenceUrl: nullableUrl,
  verifyUrl: nullableUrl,
  verifyPoint: nullableText,
})
export type TaskInput = z.infer<typeof taskInputSchema>

export const statusChangeSchema = z.object({
  taskId: z.string().min(1),
  toStatus: taskStatusSchema,
  reason: z.string().trim().min(1).optional().nullable(),
})

export const commentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().trim().min(1, '내용을 입력해주세요.'),
})

export const templateUseSchema = z.object({
  templateId: z.string().min(1),
  environment: environmentSchema,
  baseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '기준 마감일을 선택해주세요.')
    .nullable()
    .or(z.literal('').transform(() => null)),
})

export const emailSchema = z.string().trim().email('올바른 이메일 형식이 아닙니다.')

export const webhookUrlSchema = z.string().trim().url('올바른 URL 형식이 아닙니다.')
