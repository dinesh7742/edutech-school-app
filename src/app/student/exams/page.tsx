
import { ExamListClient } from "@/components/student/ExamListClient";
import { School } from "lucide-react";

export default function ExamsPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <School className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Online Exams</h1>
      </div>
      <p className="mb-6 text-muted-foreground">
        Here are the online exams assigned to your class. Click "Take Exam" to open the test in a new tab.
      </p>
      <ExamListClient />
    </div>
  );
}
