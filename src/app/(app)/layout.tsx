import { Navbar, PageShell } from '@/components/layout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <Navbar />
      <PageShell>{children}</PageShell>
    </div>
  );
}
