import { AppSidebar, AppMobileNav } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <AppSidebar />
      <div className="lg:pl-60">
        <AppTopbar />
        <AppMobileNav />
        <main>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
