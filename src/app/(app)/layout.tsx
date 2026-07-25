import { requireUser } from '@/lib/auth'
import { getUsers } from '@/lib/db/queries'
import { Nav } from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, members] = await Promise.all([requireUser(), getUsers()])

  return (
    <div className="flex min-h-screen bg-background font-[Pretendard,system-ui,sans-serif]">
      <Nav currentUser={user} members={members} />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
