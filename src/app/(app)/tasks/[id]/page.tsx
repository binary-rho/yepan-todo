import { notFound } from 'next/navigation'
import {
  getTaskById,
  getUsers,
  getCommentsForTask,
  getHistoriesForTask,
  getSchedulePhases,
} from '@/lib/db/queries'
import { getScreenshotSignedUrl } from '@/lib/storage'
import { TaskDetailView } from '@/components/TaskDetailView'

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = await getTaskById(params.id)
  if (!task) notFound()

  const [users, comments, histories, screenshotUrl, phases] = await Promise.all([
    getUsers(),
    getCommentsForTask(task.id),
    getHistoriesForTask(task.id),
    task.screenshotUrl ? getScreenshotSignedUrl(task.screenshotUrl) : Promise.resolve(null),
    getSchedulePhases(),
  ])

  return (
    <TaskDetailView
      task={task}
      userList={users}
      comments={comments}
      histories={histories}
      screenshotUrl={screenshotUrl}
      phases={phases}
    />
  )
}
