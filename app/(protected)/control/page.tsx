import { ControlDashboard } from '@/components/control/ControlDashboard'
import { ControlAccess } from '@/components/auth/ControlAccess'

export default function ControlPage() {
  return <ControlAccess><ControlDashboard /></ControlAccess>
}
