import { AppShell } from '@/components/app/Shell';
import '@/styles/app.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
