
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GradeDivisionSelector } from "./GradeDivisionSelector";
import type { UserRole } from "@/types";
import { Loader2 } from "lucide-react";

// Extend window type for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

const baseSchema = z.object({
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  role: z.enum(["student", "teacher"], { required_error: "Please select a role" }),
  grade: z.string().min(1, "Please select a grade"),
  division: z.string().min(1, "Please select a division"),
});

const emailSignupSchema = baseSchema.extend({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type EmailSignupFormValues = z.infer<typeof emailSignupSchema>;

const phoneSignupSchema = baseSchema.extend({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +919876543210)."),
});
type PhoneSignupFormValues = z.infer<typeof phoneSignupSchema>;

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});
type OtpFormValues = z.infer<typeof otpSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phoneSignupData, setPhoneSignupData] = useState<PhoneSignupFormValues | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  const emailForm = useForm<EmailSignupFormValues>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { role: "student", grade: "1", division: "A" }
  });

  const phoneForm = useForm<PhoneSignupFormValues>({
    resolver: zodResolver(phoneSignupSchema),
    defaultValues: { role: "student", grade: "1", division: "A" }
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
  });

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => { /* reCAPTCHA solved */ },
      });
    }
  };

  const saveUserToFirestore = async (user: FirebaseUser, data: EmailSignupFormValues | PhoneSignupFormValues) => {
    const isPhoneSignup = 'phoneNumber' in data;
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: isPhoneSignup ? null : data.email,
      phoneNumber: isPhoneSignup ? data.phoneNumber : null,
      displayName: data.displayName,
      role: data.role,
      grade: data.grade,
      division: data.division,
      createdAt: new Date(),
    });
  };

  const onEmailSubmit: SubmitHandler<EmailSignupFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: data.displayName });
      await saveUserToFirestore(user, data);
      
      toast({ title: "Signup Successful", description: "Welcome! Redirecting..." });
      router.push(data.role === "student" ? "/student/dashboard" : "/teacher/dashboard");
    } catch (error: any) {
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onPhoneSubmit: SubmitHandler<PhoneSignupFormValues> = async (data) => {
    setIsLoading(true);
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, data.phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      setPhoneSignupData(data);
      setShowOtpInput(true);
      toast({ title: "OTP Sent", description: "Please check your phone for the code." });
    } catch (error: any) {
      toast({ title: "Error Sending OTP", description: error.message, variant: "destructive" });
      window.recaptchaVerifier.render().then((widgetId: any) => {
          grecaptcha.reset(widgetId);
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit: SubmitHandler<OtpFormValues> = async (data) => {
    if (!window.confirmationResult || !phoneSignupData) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await window.confirmationResult.confirm(data.otp);
      const user = userCredential.user;
      await updateProfile(user, { displayName: phoneSignupData.displayName });
      await saveUserToFirestore(user, phoneSignupData);
      
      toast({ title: "Signup Successful", description: "Welcome! Redirecting..." });
      router.push(phoneSignupData.role === "student" ? "/student/dashboard" : "/teacher/dashboard");
    } catch (error: any) {
      toast({ title: "Invalid OTP", description: "The code you entered is incorrect.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Join CampusConnect to access school resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
             <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Sign up with Email</TabsTrigger>
              <TabsTrigger value="phone">Sign up with Phone</TabsTrigger>
            </TabsList>

            {/* Email Signup Tab */}
            <TabsContent value="email" className="pt-4">
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="displayNameEmail">Full Name *</Label>
                  <Input id="displayNameEmail" {...emailForm.register("displayName")} placeholder="John Doe" />
                  {emailForm.formState.errors.displayName && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.displayName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...emailForm.register("email")} placeholder="you@example.com" />
                  {emailForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" {...emailForm.register("password")} placeholder="••••••••" />
                  {emailForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.password.message}</p>}
                </div>
                {/* Shared Fields */}
                 <div>
                    <Label>I am a *</Label>
                    <Controller name="role" control={emailForm.control} render={({field}) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4 mt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="student" id="student_email" /><Label htmlFor="student_email">Student</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="teacher" id="teacher_email" /><Label htmlFor="teacher_email">Teacher</Label></div>
                        </RadioGroup>
                    )} />
                    {emailForm.formState.errors.role && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.role.message}</p>}
                </div>
                <GradeDivisionSelector grade={emailForm.watch("grade")} onGradeChange={(v) => emailForm.setValue("grade", v)} division={emailForm.watch("division")} onDivisionChange={(v) => emailForm.setValue("division", v)} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign Up with Email
                </Button>
              </form>
            </TabsContent>

            {/* Phone Signup Tab */}
            <TabsContent value="phone" className="pt-4">
              {!showOtpInput ? (
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                  <div>
                    <Label htmlFor="displayNamePhone">Full Name *</Label>
                    <Input id="displayNamePhone" {...phoneForm.register("displayName")} placeholder="Jane Doe" />
                    {phoneForm.formState.errors.displayName && <p className="text-sm text-destructive mt-1">{phoneForm.formState.errors.displayName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input id="phoneNumber" type="tel" {...phoneForm.register("phoneNumber")} placeholder="+919876543210" />
                    {phoneForm.formState.errors.phoneNumber && <p className="text-sm text-destructive mt-1">{phoneForm.formState.errors.phoneNumber.message}</p>}
                  </div>
                   {/* Shared Fields */}
                  <div>
                    <Label>I am a *</Label>
                     <Controller name="role" control={phoneForm.control} render={({field}) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4 mt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="student" id="student_phone" /><Label htmlFor="student_phone">Student</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="teacher" id="teacher_phone" /><Label htmlFor="teacher_phone">Teacher</Label></div>
                        </RadioGroup>
                    )} />
                    {phoneForm.formState.errors.role && <p className="text-sm text-destructive mt-1">{phoneForm.formState.errors.role.message}</p>}
                  </div>
                  <GradeDivisionSelector grade={phoneForm.watch("grade")} onGradeChange={(v) => phoneForm.setValue("grade", v)} division={phoneForm.watch("division")} onDivisionChange={(v) => phoneForm.setValue("division", v)} />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send OTP
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
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify & Sign Up
                  </Button>
                   <Button variant="link" size="sm" type="button" onClick={() => setShowOtpInput(false)} className="w-full">
                    Use a different phone number or edit details
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  );
}
