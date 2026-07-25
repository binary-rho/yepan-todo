import { getTemplates, getTemplateItems, getUsersForProject, resolveCurrentProject } from '@/lib/db/queries'
import { TemplatesView } from '@/components/TemplatesView'
import { CurrentUserProvider } from '@/components/CurrentUserProvider'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const [templates, currentProject] = await Promise.all([getTemplates(), resolveCurrentProject()])

  const activeProject =
    currentProject && currentProject.status === 'active'
      ? { id: currentProject.id, name: currentProject.name }
      : null

  const [entries, members] = await Promise.all([
    Promise.all(templates.map(async (tpl) => [tpl.id, await getTemplateItems(tpl.id)] as const)),
    activeProject ? getUsersForProject(activeProject.id) : Promise.resolve([]),
  ])
  const itemsByTemplate = Object.fromEntries(entries)

  return (
    <CurrentUserProvider projectId={activeProject?.id ?? 'none'} members={members}>
      <TemplatesView
        templateList={templates}
        itemsByTemplate={itemsByTemplate}
        members={members}
        activeProject={activeProject}
      />
    </CurrentUserProvider>
  )
}
