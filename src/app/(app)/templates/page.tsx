import { getTemplates, getTemplateItems, getUsers, resolveCurrentProject } from '@/lib/db/queries'
import { TemplatesView } from '@/components/TemplatesView'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const [templates, users, currentProject] = await Promise.all([
    getTemplates(),
    getUsers(),
    resolveCurrentProject(),
  ])

  const entries = await Promise.all(
    templates.map(async (tpl) => [tpl.id, await getTemplateItems(tpl.id)] as const),
  )
  const itemsByTemplate = Object.fromEntries(entries)

  const activeProject =
    currentProject && currentProject.status === 'active'
      ? { id: currentProject.id, name: currentProject.name }
      : null

  return (
    <TemplatesView
      templateList={templates}
      itemsByTemplate={itemsByTemplate}
      userList={users}
      activeProject={activeProject}
    />
  )
}
