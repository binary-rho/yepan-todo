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

export const teamRoleSchema = z.enum(['사업', '기획', 'TPM', 'FE', 'BE'])

export const memberInputSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.').max(30, '이름은 30자 이하로 입력해주세요.'),
  email: emailSchema,
  teamRole: teamRoleSchema.nullable().optional().or(z.literal('').transform(() => null)),
})
export type MemberInput = z.infer<typeof memberInputSchema>

export const memberImportItemSchema = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
})
export const memberImportListSchema = z.array(memberImportItemSchema).min(1, '가져올 멤버가 없습니다.')

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, '대시보드 이름을 입력해주세요.')
  .max(40, '이름은 40자 이하로 입력해주세요.')

export const projectNoteSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().trim().min(1, '내용을 입력해주세요.'),
})

export const templateItemSchema = z.object({
  title: z.string().trim().min(1, '항목 제목을 입력해주세요.'),
  description: nullableText,
  environment: environmentSchema.nullable().or(z.literal('').transform(() => null)),
  confluenceUrl: nullableUrl,
  verifyUrl: nullableUrl,
  verifyPoint: nullableText,
  defaultAssigneeId: z.string().trim().min(1, '항목 담당자를 선택해주세요.'),
})

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, '템플릿 이름을 입력해주세요.').max(40, '이름은 40자 이하로 입력해주세요.'),
  description: nullableText,
  items: z.array(templateItemSchema).min(1, '항목을 최소 1개 이상 추가해주세요.'),
})
export type TemplateInput = z.infer<typeof templateInputSchema>
export type TemplateItemInput = z.infer<typeof templateItemSchema>

export const webhookUrlSchema = z.string().trim().url('올바른 URL 형식이 아닙니다.')

const dateString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다.')

export const schedulePhaseSchema = z.object({
  name: z.string().trim().min(1, '국면 이름을 입력해주세요.'),
  startDate: dateString,
  endDate: dateString.nullable().or(z.literal('').transform(() => null)),
})

export const schedulePhasesSchema = z.array(schedulePhaseSchema)
export type SchedulePhaseInput = z.infer<typeof schedulePhaseSchema>
