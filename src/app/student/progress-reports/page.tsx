
import { ProgressReportClient } from "@/components/student/ProgressReportClient";
import { Award } from "lucide-react";

export default function StudentProgressReportsPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <Award className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">My Progress Reports</h1>
      </div>
       <p className="mb-6 text-muted-foreground max-w-2xl">
        Here are your academic progress reports. You can view your marks and download a copy of each report card.
      </p>
      <ProgressReportClient />
    </div>
  );
}
