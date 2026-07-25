import { notFound } from 'next/navigation'
import {
  getTaskById,
  getUsersForProject,
  getProjectById,
  getCommentsForTask,
  getHistoriesForTask,
  getSchedulePhases,
} from '@/lib/db/queries'
import { getScreenshotSignedUrl } from '@/lib/storage'
import { TaskDetailView } from '@/components/TaskDetailView'
import { CurrentUserProvider } from '@/components/CurrentUserProvider'

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = await getTaskById(params.id)
  if (!task) notFound()

  const [users, project, comments, histories, screenshotUrl, phases] = await Promise.all([
    getUsersForProject(task.projectId),
    getProjectById(task.projectId),
    getCommentsForTask(task.id),
    getHistoriesForTask(task.id),
    task.screenshotUrl ? getScreenshotSignedUrl(task.screenshotUrl) : Promise.resolve(null),
    getSchedulePhases(),
  ])
  const readOnly = project?.status === 'archived'

  return (
    <CurrentUserProvider projectId={task.projectId} members={users}>
      <TaskDetailView
        task={task}
        userList={users}
        comments={comments}
        histories={histories}
        screenshotUrl={screenshotUrl}
        phases={phases}
        readOnly={readOnly}
      />
    </CurrentUserProvider>
  )
}
