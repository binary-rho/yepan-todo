import {
  getTasksForProject,
  getUsersForProject,
  getLatestRejectionReasons,
  getWebhookUrl,
  getSchedulePhases,
  resolveCurrentProject,
  getProjectNotes,
} from '@/lib/db/queries'
import { BoardView } from '@/components/BoardView'
import { EmptyBoard } from '@/components/EmptyBoard'
import { CurrentUserProvider } from '@/components/CurrentUserProvider'

export const dynamic = 'force-dynamic'

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { project?: string }
}) {
  const currentProject = await resolveCurrentProject(searchParams.project)

  // 회차가 하나도 없으면 첫 대시보드 생성 화면을 보여준다. (마이그레이션 미실행 등)
  if (!currentProject) {
    return <EmptyBoard />
  }

  const [tasks, users, rejectionReasons, webhookUrl, phases, notes] = await Promise.all([
    getTasksForProject(currentProject.id),
    getUsersForProject(currentProject.id),
    getLatestRejectionReasons(),
    getWebhookUrl(),
    getSchedulePhases(),
    getProjectNotes(currentProject.id),
  ])

  return (
    <CurrentUserProvider projectId={currentProject.id} members={users}>
      <BoardView
        tasks={tasks}
        userList={users}
        rejectionReasons={rejectionReasons}
        webhookUrl={webhookUrl}
        phases={phases}
        currentProject={currentProject}
        notes={notes}
      />
    </CurrentUserProvider>
  )
}
