"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  Users,
  ClipboardList,
  School,
  MailOpen,
  UserCheck,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Manage Users",
    href: "/admin/manage-users",
    icon: Users,
  },
  {
    title: "Manage Staff",
    href: "/admin/manage-staff",
    icon: UserCheck,
  },
  {
    title: "Manage Submissions",
    href: "/admin/leave-applications",
    icon: MailOpen,
  },
  {
    title: "Manage Content",
    href: "/teacher/post-content",
    icon: ClipboardList,
  },
  {
    title: "Manage Reports",
    href: "/teacher/progress-reports",
    icon: GraduationCap,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 shadow-md hidden md:block">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center gap-2">
          <School className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Edutech</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
