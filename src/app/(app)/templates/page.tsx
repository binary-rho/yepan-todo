import { getTemplates, getTemplateItems } from '@/lib/db/queries'
import { TemplatesView } from '@/components/TemplatesView'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const templates = await getTemplates()

  const entries = await Promise.all(
    templates.map(async (tpl) => [tpl.id, await getTemplateItems(tpl.id)] as const),
  )
  const itemsByTemplate = Object.fromEntries(entries)

  return <TemplatesView templateList={templates} itemsByTemplate={itemsByTemplate} />
}
