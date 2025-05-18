
import { SchoolFormsList } from "@/components/student/SchoolFormsList";
import { FileArchive } from "lucide-react";

export default function SchoolFormsPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <FileArchive className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">School Forms & Applications</h1>
      </div>
      <p className="mb-6 text-muted-foreground">
        Here you can find various school forms available for download. Please download the required PDF,
        fill it out, and submit it to the school office as per instructions.
      </p>
      <SchoolFormsList />
    </div>
  );
}
