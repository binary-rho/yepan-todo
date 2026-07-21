import { getUsers } from '@/lib/db/queries'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginView } from '@/components/LoginView'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(user.role === 'admin' ? '/board' : '/')

  const users = await getUsers()
  return <LoginView users={users} />
}
