
import { ManageSubmissionsClient } from "@/components/teacher/ManageSubmissionsClient";
import { ClipboardCheck } from "lucide-react";

export default function ManageSubmissionsPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardCheck className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Manage Student Submissions</h1>
      </div>
      <p className="mb-6 text-muted-foreground">
        Select an application type below to review submitted requests.
      </p>
      <ManageSubmissionsClient />
    </div>
  );
}

    