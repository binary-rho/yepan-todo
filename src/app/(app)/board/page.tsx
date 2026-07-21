import { requireAdmin } from '@/lib/auth'
import { getAllTasks, getUsers, getLatestRejectionReasons, getWebhookUrl } from '@/lib/db/queries'
import { BoardView } from '@/components/BoardView'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  await requireAdmin()
  const [tasks, users, rejectionReasons, webhookUrl] = await Promise.all([
    getAllTasks(),
    getUsers(),
    getLatestRejectionReasons(),
    getWebhookUrl(),
  ])

  return (
    <BoardView
      tasks={tasks}
      userList={users}
      rejectionReasons={rejectionReasons}
      webhookUrl={webhookUrl}
    />
  )
}
