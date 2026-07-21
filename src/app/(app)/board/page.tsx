import { requireAdmin } from '@/lib/auth'
import { getAllTasks, getUsers, getLatestRejectionReasons } from '@/lib/db/queries'
import { BoardView } from '@/components/BoardView'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  await requireAdmin()
  const [tasks, users, rejectionReasons] = await Promise.all([
    getAllTasks(),
    getUsers(),
    getLatestRejectionReasons(),
  ])

  return <BoardView tasks={tasks} userList={users} rejectionReasons={rejectionReasons} />
}
