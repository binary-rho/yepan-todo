"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CurrentIdentityField } from "@/components/CurrentIdentityField";

const NAV_ITEMS = [
  { label: "보드", href: "/" },
  { label: "템플릿", href: "/templates" },
  { label: "이전 예판 보관함", href: "/archive" },
] as const;

// "현재 사용자"는 회차를 옮겨도 유지되는 브라우저 설정이라 항상 보이는 이 자리에 둔다.
// 회차별 멤버 목록 관리는 프로젝트 화면 헤더에 있다. (ProjectMembersButton 참고)
export function Nav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-zinc-100">
        <p className="text-[14px] font-semibold text-zinc-900 tracking-tight">
          BO 세팅 관리
        </p>
      </div>

      <nav className="flex-1 px-2.5 py-2.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block w-full text-left px-3 py-2 text-[13px] rounded tracking-tight transition-colors mb-0.5 ${
              isActive(item.href)
                ? "bg-zinc-100 text-zinc-900 font-medium"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <CurrentIdentityField />
    </aside>
  );
}
