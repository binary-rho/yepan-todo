import { z } from 'zod'
import { DUE_OFFSET_LIMIT_DAYS } from '@/lib/templateDueDate'

const dateString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다.')

const nullableDate = dateString.nullable().or(z.literal('').transform(() => null))

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

export const environmentSchema = z.enum(['stg', 'prod'])
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'review_requested', 'done', 'rejected'])

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요.'),
  description: nullableText,
  // 담당자는 나중에 정해도 된다(미지정으로 먼저 등록 가능).
  assigneeId: z.string().trim().min(1).nullable().or(z.literal('').transform(() => null)),
  environment: environmentSchema,
  dueDate: nullableDate,
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
  // 템플릿은 여러 회차에 재사용되므로 담당자는 적용 시점에 그 회차 멤버 중에서 고른다.
  // key: template_item id, value: 이 회차 멤버(user) id. 빈 문자열이면 담당자 미지정으로 만든다.
  assigneeByItemId: z.record(z.string(), z.string()),
})

export const emailSchema = z.string().trim().email('올바른 이메일 형식이 아닙니다.')

export const teamRoleSchema = z.enum(['사업', '기획', 'TPM', 'FE', 'BE'])

export const memberInputSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.').max(30, '이름은 30자 이하로 입력해주세요.'),
  email: emailSchema,
  teamRole: teamRoleSchema.nullable().optional().or(z.literal('').transform(() => null)),
})
export type MemberInput = z.infer<typeof memberInputSchema>

// 브라우저에 저장하는 "현재 사용자"(본인 정보). 회차 멤버와 이메일로 매칭되므로 멤버 입력과 같은 규칙을 쓴다.
export const identityInputSchema = memberInputSchema.omit({ teamRole: true })

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

export const projectDescriptionSchema = z
  .string()
  .trim()
  .max(200, '설명은 200자 이하로 입력해주세요.')
  .optional()

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
  // 실제 배정이 아니라 자유 텍스트 힌트다(회차마다 멤버가 달라 id로 고정할 수 없음). 실제 담당자는 템플릿 적용 시 고른다.
  defaultAssigneeName: nullableText,
  // 마감일 규칙. 일정은 회차마다 id 가 새로 발급되므로 이름으로 참조한다.
  duePhaseName: nullableText,
  dueOffsetDays: z
    .number()
    .int('일수는 정수로 입력해주세요.')
    .min(-DUE_OFFSET_LIMIT_DAYS, `일수는 ${DUE_OFFSET_LIMIT_DAYS}일 이내로 입력해주세요.`)
    .max(DUE_OFFSET_LIMIT_DAYS, `일수는 ${DUE_OFFSET_LIMIT_DAYS}일 이내로 입력해주세요.`),
  dueDate: nullableDate,
})

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, '템플릿 이름을 입력해주세요.').max(40, '이름은 40자 이하로 입력해주세요.'),
  description: nullableText,
  items: z.array(templateItemSchema).min(1, '항목을 최소 1개 이상 추가해주세요.'),
})
export type TemplateInput = z.infer<typeof templateInputSchema>
export type TemplateItemInput = z.infer<typeof templateItemSchema>

export const webhookUrlSchema = z.string().trim().url('올바른 URL 형식이 아닙니다.')

export const schedulePhaseSchema = z.object({
  name: z.string().trim().min(1, '국면 이름을 입력해주세요.'),
  startDate: dateString,
  endDate: nullableDate,
})

export const schedulePhasesSchema = z.array(schedulePhaseSchema)
export type SchedulePhaseInput = z.infer<typeof schedulePhaseSchema>
