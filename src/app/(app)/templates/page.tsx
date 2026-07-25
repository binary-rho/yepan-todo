import { getSchedulePhases, getTemplatesWithItems } from '@/lib/db/queries'
import { TemplatesView } from '@/components/TemplatesView'

export const dynamic = 'force-dynamic'

// 템플릿은 대시보드(회차)에 귀속되지 않는 공용 자산이다. 그래서 이 화면은 회차/멤버 맥락 없이
// 템플릿 관리(생성·수정·삭제)만 다룬다. 특정 회차에 항목을 만드는 일은 보드에서 한다.
// 일정(schedule_phases)은 회차와 무관한 전역 목록이라 항목 마감일 규칙에 쓸 수 있다.
export default async function TemplatesPage() {
  const [{ templates, itemsByTemplate }, phases] = await Promise.all([
    getTemplatesWithItems(),
    getSchedulePhases(),
  ])

  return <TemplatesView templateList={templates} itemsByTemplate={itemsByTemplate} phases={phases} />
}
