
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  type AuthError,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Email Login Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// Phone Login Schemas
const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +919876543210)."),
});
type PhoneFormValues = z.infer<typeof phoneSchema>;

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});
type OtpFormValues = z.infer<typeof otpSchema>;

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

  // Phone Auth State
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  
  const emailForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
  });

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
           toast({ title: "reCAPTCHA Expired", description: "Please try sending the OTP again.", variant: "destructive" });
        }
      });
    }
  };

  const onPhoneSubmit: SubmitHandler<PhoneFormValues> = async (data) => {
    setIsLoading(true);
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    try {
      const result = await signInWithPhoneNumber(auth, data.phoneNumber, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (error: any) {
      console.error("Phone sign-in error:", error);
      toast({ title: "Error Sending OTP", description: error.message, variant: "destructive" });
      window.recaptchaVerifier.render().then((widgetId: any) => {
          grecaptcha.reset(widgetId);
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit: SubmitHandler<OtpFormValues> = async (data) => {
    if (!confirmationResult) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await confirmationResult.confirm(data.otp);
      toast({ title: "Login Successful", description: "Welcome back! Redirecting..." });
      router.push("/");
    } catch (error: any) {
      console.error("OTP confirmation error:", error);
      toast({ title: "Invalid OTP", description: "The code you entered is incorrect. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


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
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Welcome Back!</CardTitle>
          <CardDescription className="text-center">
            Log in to access your Edutech dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="pt-4">
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
            </TabsContent>
            <TabsContent value="phone" className="pt-4">
              {!showOtpInput ? (
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" type="tel" {...phoneForm.register("phoneNumber")} placeholder="+919876543210" />
                    {phoneForm.formState.errors.phoneNumber && <p className="text-sm text-destructive mt-1">{phoneForm.formState.errors.phoneNumber.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>
                </form>
              ) : (
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                   <div>
                    <Label htmlFor="otp">Verification Code (OTP)</Label>
                    <Input id="otp" type="text" {...otpForm.register("otp")} placeholder="123456" />
                    {otpForm.formState.errors.otp && <p className="text-sm text-destructive mt-1">{otpForm.formState.errors.otp.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify OTP & Log In
                  </Button>
                  <Button variant="link" size="sm" type="button" onClick={() => setShowOtpInput(false)} className="w-full">
                    Use a different phone number
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
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
