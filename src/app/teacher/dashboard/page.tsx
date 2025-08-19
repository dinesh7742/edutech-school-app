import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const TeacherDashboardClient = dynamic(
  () => import("@/components/teacher/DashboardClient").then(mod => mod.TeacherDashboardClient),
  { 
    ssr: false,
    loading: () => (
        <div className="space-y-8">
            <Skeleton className="h-10 w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                ))}
            </div>
        </div>
    )
  }
);

export default function TeacherDashboardPage() {
  return <TeacherDashboardClient />;
}
