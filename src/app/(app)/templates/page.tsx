import { getTemplatesWithItems, getUsersForProject, resolveCurrentProject } from '@/lib/db/queries'
import { TemplatesView } from '@/components/TemplatesView'
import { ProjectMemberProvider } from '@/components/ProjectMemberProvider'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const [{ templates, itemsByTemplate }, currentProject] = await Promise.all([
    getTemplatesWithItems(),
    resolveCurrentProject(),
  ])

  const activeProject =
    currentProject && currentProject.status === 'active'
      ? { id: currentProject.id, name: currentProject.name }
      : null

  const members = activeProject ? await getUsersForProject(activeProject.id) : []

  return (
    <ProjectMemberProvider projectId={activeProject?.id ?? 'none'} members={members}>
      <TemplatesView
        templateList={templates}
        itemsByTemplate={itemsByTemplate}
        members={members}
        activeProject={activeProject}
      />
    </ProjectMemberProvider>
  )
}
