
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  type AuthError
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Email Login Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// Forgot Password Schema
const forgotPasswordSchema = z.object({
  resetEmail: z.string().email("Please enter a valid email address."),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;


function getLoginErrorMessage(error: AuthError): string {
  if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
    return "Invalid email or password. Please check your credentials or sign up if you don't have an account.";
  }
  return error.message || "An unexpected error occurred during login. Please try again.";
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailError, setResetEmailError] = useState<string | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  
  const emailForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onEmailSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to your dashboard...",
      });
      router.push("/"); 
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: getLoginErrorMessage(error as AuthError),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      forgotPasswordSchema.parse({ resetEmail });
      setResetEmailError(null);
      setIsSendingResetEmail(true);
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${resetEmail}, you will receive an email with instructions.`,
      });
      setShowForgotPasswordDialog(false);
      setResetEmail("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setResetEmailError(error.errors[0].message);
      } else {
        console.error("Password reset error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Welcome Back!</CardTitle>
          <CardDescription className="text-center">
            Log in to access your Edutech dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...emailForm.register("email")} placeholder="you@example.com" />
              {emailForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...emailForm.register("password")} placeholder="••••••••" />
              {emailForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In
            </Button>
             <Button variant="link" size="sm" type="button" className="text-sm text-primary p-0 h-auto w-full" onClick={() => setShowForgotPasswordDialog(true)}>
                Forgot Password?
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-4">
            <p className="text-center text-sm">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
        </CardFooter>
      </Card>

      <AlertDialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forgot Your Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email address below, and we'll send you a link to reset your password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="resetEmail">Email Address</Label>
            <Input
              id="resetEmail"
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => { setResetEmail(e.target.value); if (resetEmailError) setResetEmailError(null); }}
            />
            {resetEmailError && <p className="text-sm text-destructive mt-1">{resetEmailError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setResetEmail(""); setResetEmailError(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordReset} disabled={isSendingResetEmail || !resetEmail}>
              {isSendingResetEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
