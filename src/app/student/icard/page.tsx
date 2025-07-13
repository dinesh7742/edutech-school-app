
import { VisualICard } from "@/components/student/VisualICard";
import { Contact } from "lucide-react";

export default function StudentICardPage() {
  return (
    <div className="py-4 flex flex-col items-center">
      <div className="flex items-center gap-3 mb-6">
        <Contact className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">My School I-Card</h1>
      </div>
       <p className="mb-6 text-muted-foreground max-w-2xl text-center">
        Here is your official school identity card. You can download it as an image.
        Ensure your profile information is up-to-date for an accurate I-Card.
      </p>
      <VisualICard />
    </div>
  );
}
