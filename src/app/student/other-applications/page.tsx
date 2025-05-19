
import { OtherApplicationListClient } from "@/components/student/OtherApplicationListClient";
import { FileSignature } from "lucide-react";

export default function OtherApplicationsPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <FileSignature className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Other School Applications</h1>
      </div>
      <p className="mb-6 text-muted-foreground">
        Here you can apply online for various school requests or download blank PDF forms.
      </p>
      <OtherApplicationListClient />
    </div>
  );
}
