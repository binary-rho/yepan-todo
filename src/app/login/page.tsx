import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginView } from '@/components/LoginView'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  const user = await getCurrentUser()
  if (user) redirect(user.role === 'admin' ? '/board' : '/')

  return <LoginView next={searchParams.redirect} />
}
