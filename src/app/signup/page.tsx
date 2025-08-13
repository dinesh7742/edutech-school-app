
import { SignupForm } from "@/components/auth/SignupForm";
import { School } from "lucide-react";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-yellow-300 to-orange-400 p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5 z-0"></div>
      <div className="relative z-10 flex flex-col items-center space-y-6 w-full">
        <div className="flex items-center space-x-3 text-primary mb-2">
          <School size={48} />
          <h1 className="text-4xl font-bold">Edutech</h1>
        </div>
        <div className="flex items-center justify-center mb-4">
          <Image src="https://i.postimg.cc/8P0y0gxz/MCGM-Seal.jpg" alt="MCGM Seal" width={128} height={128} className="h-32 w-32 rounded-full" data-ai-hint="logo seal" />
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
