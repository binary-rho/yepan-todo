import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getTaskById, getUsers, getCommentsForTask, getHistoriesForTask } from '@/lib/db/queries'
import { TaskDetailView } from '@/components/TaskDetailView'

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const currentUser = await requireUser()
  const task = await getTaskById(params.id)
  if (!task) notFound()

  const [users, comments, histories] = await Promise.all([
    getUsers(),
    getCommentsForTask(task.id),
    getHistoriesForTask(task.id),
  ])

  return (
    <TaskDetailView
      task={task}
      userList={users}
      comments={comments}
      histories={histories}
      currentUser={currentUser}
    />
  )
}
