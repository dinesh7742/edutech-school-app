
import { MyApplicationsPageClient } from "@/components/student/MyApplicationsPageClient";
import { FileSignature } from "lucide-react";

export default function MyApplicationsHubPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <FileSignature className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">My School Applications & Forms</h1>
      </div>
      <MyApplicationsPageClient />
    </div>
  );
}

    