import {
  getTasksForProject,
  getUsersForProject,
  getLatestRejectionReasons,
  getWebhookUrl,
  getSchedulePhases,
  resolveCurrentProject,
  getProjectNotes,
  getTemplatesWithItems,
} from '@/lib/db/queries'
import { BoardView } from '@/components/BoardView'
import { EmptyBoard } from '@/components/EmptyBoard'
import { ProjectMemberProvider } from '@/components/ProjectMemberProvider'

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

  const [tasks, users, rejectionReasons, webhookUrl, phases, notes, templateData] = await Promise.all([
    getTasksForProject(currentProject.id),
    getUsersForProject(currentProject.id),
    getLatestRejectionReasons(),
    getWebhookUrl(),
    getSchedulePhases(),
    getProjectNotes(currentProject.id),
    getTemplatesWithItems(),
  ])

  return (
    <ProjectMemberProvider projectId={currentProject.id} members={users}>
      <BoardView
        tasks={tasks}
        userList={users}
        rejectionReasons={rejectionReasons}
        webhookUrl={webhookUrl}
        phases={phases}
        currentProject={currentProject}
        notes={notes}
        templates={templateData.templates}
        itemsByTemplate={templateData.itemsByTemplate}
      />
    </ProjectMemberProvider>
  )
}
