import { AppShell } from '@/components/layout/AppShell'
import { PaludariumProvider } from '@/providers/PaludariumProvider'

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PaludariumProvider><AppShell>{children}</AppShell></PaludariumProvider>
}
