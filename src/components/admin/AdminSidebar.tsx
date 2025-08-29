
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  Users,
  CalendarCheck,
  GraduationCap,
  ClipboardList,
  Wallet,
  Settings,
  School,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Institute",
    icon: Building,
    subItems: [
      { title: "Manage Users", href: "/admin/manage-users", icon: Users },
      { title: "Manage Content", href: "/teacher/post-content", icon: ClipboardList },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    subItems: [
      { title: "Mark Attendance", href: "/teacher/mark-attendance", icon: CalendarCheck },
    ],
  },
  {
    title: "Examination",
    icon: GraduationCap,
    subItems: [
        { title: "Manage Reports", href: "/teacher/progress-reports", icon: GraduationCap },
    ],
  },
  {
    title: "Billing",
    icon: ClipboardList,
    subItems: [],
  },
  {
    title: "Accounts",
    icon: Wallet,
    subItems: [],
  },
  {
    title: "Settings",
    icon: Settings,
    subItems: [],
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
          <Accordion type="multiple" defaultValue={["Institute", "Attendance", "Examination"]}>
            {sidebarNavItems.map((item) =>
              item.subItems && item.subItems.length > 0 ? (
                <AccordionItem key={item.title} value={item.title} className="border-b-0">
                  <AccordionTrigger className="text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-3 py-2">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-8 pt-2 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === subItem.href
                            ? "bg-primary/10 text-primary"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <subItem.icon className="h-4 w-4" />
                        {subItem.title}
                      </Link>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <Link
                  key={item.href}
                  href={item.href || "#"}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                    !item.href && "cursor-not-allowed opacity-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            )}
          </Accordion>
        </nav>
      </div>
    </aside>
  );
}
