import { getUsers } from '@/lib/db/queries'
import { Nav } from '@/components/Nav'
import { CurrentUserProvider } from '@/components/CurrentUserProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const members = await getUsers()

  return (
    <CurrentUserProvider members={members}>
      <div className="flex min-h-screen bg-background font-[Pretendard,system-ui,sans-serif]">
        <Nav />
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>
    </CurrentUserProvider>
  )
}
