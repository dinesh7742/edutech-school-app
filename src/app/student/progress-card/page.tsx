import { ProgressCardClient } from "@/components/student/ProgressCardClient";
import { BarChart3 } from "lucide-react";

export default function ProgressCardPage() {
  return (
    <div className="py-4 flex flex-col items-center">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">My Progress Card</h1>
      </div>
       <p className="mb-6 text-muted-foreground max-w-2xl text-center">
        Enter your roll number and select the term to view your academic progress report.
        You can also download a copy of the report card.
      </p>
      <ProgressCardClient />
    </div>
  );
}
