
import { ViewResultClient } from "@/components/student/ViewResultClient";
import { Award } from "lucide-react";

export default function StudentResultsPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <Award className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">View My Results</h1>
      </div>
       <p className="mb-6 text-muted-foreground max-w-2xl">
        Select an academic year and enter your roll number to view your progress report.
      </p>
      <ViewResultClient />
    </div>
  );
}
