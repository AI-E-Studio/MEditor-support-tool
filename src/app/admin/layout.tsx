import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <AdminSidebar />
      <div className="lg:pl-60">
        <AdminTopbar />
        <AdminMobileNav />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
