import { StudentDashboardClient } from "@/components/student/DashboardClient";
import { Suspense } from "react";

export default function StudentDashboardPage() {
  return (
    <Suspense>
      <StudentDashboardClient />
    </Suspense>
  );
}
