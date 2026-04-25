import { UserMenu } from "@/components/UserMenu";
import { CurrentPageLabel } from "@/components/admin/CurrentPageLabel";

export function AdminTopbar() {
  return (
    <header
      className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-4 px-6"
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="lg:hidden w-8 h-8 rounded-lg bg-[#2651A6] grid place-items-center text-white text-sm font-bold shrink-0">
          M
        </div>
        <CurrentPageLabel />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <UserMenu />
      </div>
    </header>
  );
}
