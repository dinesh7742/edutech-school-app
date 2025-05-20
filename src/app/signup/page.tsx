import { SignupForm } from "@/components/auth/SignupForm";
import { School } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5 z-0"></div>
      <div className="relative z-10 flex flex-col items-center space-y-6 w-full">
        <div className="flex items-center space-x-3 text-primary mb-6">
          <School size={48} />
          <h1 className="text-4xl font-bold">Edutech</h1>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}

// CSS for bg-grid-pattern (add to globals.css or keep here if specific)
// This is an example, you might want a more subtle pattern
// For simplicity, this style can be inlined or managed with Tailwind config extensions if needed
// Since it's a small utility, keeping it here for now.
// It's better to add to globals.css or tailwind.config.js for cleanliness.
// Adding this to globals.css instead.