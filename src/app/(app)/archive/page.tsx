import { getProjects, getProjectTaskCounts } from '@/lib/db/queries'
import { ArchiveView } from '@/components/ArchiveView'

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const [projects, taskCounts] = await Promise.all([getProjects(), getProjectTaskCounts()])
  const archivedProjects = projects.filter((p) => p.status === 'archived')

  return <ArchiveView projects={archivedProjects} taskCounts={taskCounts} />
}
