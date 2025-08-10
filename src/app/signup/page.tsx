import { SignupForm } from "@/components/auth/SignupForm";
import { School } from "lucide-react";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5 z-0"></div>
      <div className="relative z-10 flex flex-col items-center space-y-6 w-full">
        <div className="flex items-center space-x-3 text-primary mb-2">
          <School size={48} />
          <h1 className="text-4xl font-bold">Edutech</h1>
        </div>
        <div className="flex items-center justify-center space-x-4 mb-4">
          <Image src="https://i.postimg.cc/8P0y0gxz/MCGM-Seal.jpg" alt="MCGM Seal" width={64} height={64} className="h-16 w-16" data-ai-hint="logo seal" />
          <Image src="https://i.postimg.cc/G2KKPWkr/Logo1.png" alt="School Logo" width={64} height={64} className="h-16 w-16" data-ai-hint="school logo" />
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
