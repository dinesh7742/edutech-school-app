
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User as FirebaseUser,
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
import { useToast } from "@/hooks/use-toast";
import { GradeDivisionSelector } from "./GradeDivisionSelector";
import type { UserRole } from "@/types";
import { Loader2, ShieldCheck } from "lucide-react";

const signupSchema = z.object({
  signupMethod: z.enum(["email", "phone"], { required_error: "Please select a signup method" }),
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  otp: z.string().optional(),
  role: z.enum(["student", "teacher"], { required_error: "Please select a role" }),
  grade: z.string().min(1, "Please select a grade"),
  division: z.string().min(1, "Please select a division"),
}).superRefine((data, ctx) => {
  if (data.signupMethod === "email") {
    if (!data.email || !z.string().email().safeParse(data.email).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid email is required for email signup", path: ["email"] });
    }
    if (!data.password || data.password.length < 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password must be at least 6 characters for email signup", path: ["password"] });
    }
  } else if (data.signupMethod === "phone") {
    if (!data.phoneNumber || !/^\+[1-9]\d{1,14}$/.test(data.phoneNumber)) { // Basic E.164 format check
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid phone number in E.164 format (e.g., +1xxxxxxxxxx) is required", path: ["phoneNumber"] });
    }
    // OTP is validated separately in the UI flow, not necessarily here if it's a multi-step process before final submit
  }
});

type SignupFormValues = z.infer<typeof signupSchema>;

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors }, trigger, getValues } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      signupMethod: "email",
      role: "student",
      grade: "1",
      division: "A",
    },
  });

  const selectedRole = watch("role");
  const currentSignupMethod = watch("signupMethod");

  useEffect(() => {
    // Ensure reCAPTCHA is only initialized client-side and once
    if (currentSignupMethod === "phone" && !window.recaptchaVerifier && recaptchaContainerRef.current) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible', // Can be 'normal' or 'invisible'
          'callback': (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
            console.log("reCAPTCHA solved:", response);
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            toast({ title: "reCAPTCHA Expired", description: "Please try sending OTP again.", variant: "destructive"});
            setIsSendingOtp(false);
          }
        });
        window.recaptchaVerifier.render().catch(err => {
            console.error("RecaptchaVerifier render error:", err);
            toast({ title: "reCAPTCHA Error", description: "Could not render reCAPTCHA. Ensure your domain is authorized in Firebase/Google Cloud.", variant: "destructive" });
        });
      } catch (error: any) {
        console.error("Error initializing RecaptchaVerifier:", error);
        toast({ title: "reCAPTCHA Setup Error", description: `Could not initialize reCAPTCHA: ${error.message}`, variant: "destructive" });
      }
    }
     // Cleanup reCAPTCHA on component unmount
    return () => {
      if (window.recaptchaVerifier) {
        // Check if clear method exists (it was added in later SDK versions)
        try { (window.recaptchaVerifier as any).clear(); } catch (e) { /* ignore */ }
        window.recaptchaVerifier = undefined;
      }
    };
  }, [currentSignupMethod, toast]);


  const handleSendOtp = async () => {
    const phoneNumber = getValues("phoneNumber");
    const displayName = getValues("displayName");
    const role = getValues("role");
    const grade = getValues("grade");
    const division = getValues("division");

    // Validate necessary fields before sending OTP
    const isValidName = await trigger("displayName");
    const isValidPhone = await trigger("phoneNumber");
    const isValidRole = await trigger("role");
    const isValidGrade = await trigger("grade");
    const isValidDivision = await trigger("division");


    if (!isValidName || !isValidPhone || !isValidRole || !isValidGrade || !isValidDivision) {
        toast({ title: "Missing Information", description: "Please fill all required fields before sending OTP.", variant: "destructive" });
        return;
    }
    if (!phoneNumber) { // Should be caught by Zod, but double check
        toast({ title: "Phone Number Required", description: "Please enter your phone number.", variant: "destructive" });
        return;
    }
    if (!window.recaptchaVerifier) {
        toast({ title: "reCAPTCHA Error", description: "reCAPTCHA verifier not initialized. Please refresh.", variant: "destructive" });
        return;
    }

    setIsSendingOtp(true);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      toast({ title: "OTP Sent", description: `OTP has been sent to ${phoneNumber}.` });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({ title: "OTP Send Failed", description: error.message || "Could not send OTP. Please check the phone number or try again.", variant: "destructive" });
      // Reset reCAPTCHA if error
      if (window.recaptchaVerifier) {
         try { (window.recaptchaVerifier as any).clear(); } catch (e) { /* ignore */ }
         window.recaptchaVerifier = undefined; // Force reinitialization if needed
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const saveUserToFirestore = async (user: FirebaseUser, data: SignupFormValues) => {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: data.signupMethod === 'email' ? data.email : null,
      phoneNumber: data.signupMethod === 'phone' ? user.phoneNumber : null,
      displayName: data.displayName,
      role: data.role,
      grade: data.grade,
      division: data.division,
      createdAt: new Date(),
    });
  };

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    setIsLoading(true);
    try {
      let user: FirebaseUser;

      if (data.signupMethod === "email") {
        if (!data.email || !data.password) {
            toast({title: "Error", description: "Email and password are required for email signup.", variant: "destructive"});
            setIsLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        user = userCredential.user;
        await updateProfile(user, { displayName: data.displayName });
      } else if (data.signupMethod === "phone") {
        if (!window.confirmationResult) {
          toast({ title: "Error", description: "OTP not verified yet or session expired.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!data.otp || data.otp.length !== 6) {
            toast({title: "Invalid OTP", description: "Please enter a valid 6-digit OTP.", variant: "destructive"});
            setIsLoading(false);
            return;
        }
        const userCredential = await window.confirmationResult.confirm(data.otp);
        user = userCredential.user;
        // For phone auth, displayName is not set automatically on the Auth user object by Firebase.
        // We can try to update it, but primarily rely on Firestore for displayName.
        // await updateProfile(user, { displayName: data.displayName }); // Optional
      } else {
        toast({ title: "Error", description: "Invalid signup method.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      await saveUserToFirestore(user, data);
      
      toast({
        title: "Signup Successful",
        description: "Welcome to CampusConnect! You are now being redirected.",
      });

      setTimeout(() => {
        router.push(data.role === "student" ? "/student/dashboard" : "/teacher/dashboard");
      }, 1000);

    } catch (error: any)      {
      console.error("Signup error:", error);
      toast({
        title: "Signup Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">Create an Account</CardTitle>
        <CardDescription className="text-center">
          Join CampusConnect to access school resources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label>Signup Method</Label>
            <Controller
              name="signupMethod"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value as "email" | "phone");
                    setAuthMethod(value as "email" | "phone");
                    setOtpSent(false); // Reset OTP state if method changes
                    setValue("email", ""); // Clear other method's critical fields
                    setValue("password", "");
                    setValue("phoneNumber", "");
                    setValue("otp", "");
                  }}
                  value={field.value}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="emailMethod" />
                    <Label htmlFor="emailMethod">Email & Password</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phoneMethod" />
                    <Label htmlFor="phoneMethod">Phone Number & OTP</Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          <div>
            <Label htmlFor="displayName">Full Name *</Label>
            <Input id="displayName" {...register("displayName")} placeholder="John Doe" />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          {currentSignupMethod === "email" && (
            <>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} placeholder="you@example.com" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...register("password")} placeholder="••••••••" />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
            </>
          )}

          {currentSignupMethod === "phone" && (
            <>
              <div>
                <Label htmlFor="phoneNumber">Phone Number * (e.g., +12223334444)</Label>
                <Input id="phoneNumber" type="tel" {...register("phoneNumber")} placeholder="+12223334444" disabled={otpSent} />
                {errors.phoneNumber && <p className="text-sm text-destructive mt-1">{errors.phoneNumber.message}</p>}
              </div>

              <div ref={recaptchaContainerRef} id="recaptcha-container"></div>

              {!otpSent ? (
                <Button type="button" onClick={handleSendOtp} disabled={isSendingOtp} className="w-full">
                  {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              ) : (
                <div>
                  <Label htmlFor="otp">Enter OTP *</Label>
                  <Input id="otp" type="text" {...register("otp")} placeholder="Enter 6-digit OTP" maxLength={6} />
                  {errors.otp && <p className="text-sm text-destructive mt-1">{errors.otp.message}</p>}
                </div>
              )}
            </>
          )}

          <div>
            <Label>I am a *</Label>
            <Controller
                name="role"
                control={control}
                render={({field}) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4 mt-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="student" id="student" />
                            <Label htmlFor="student">Student</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="teacher" id="teacher" />
                            <Label htmlFor="teacher">Teacher</Label>
                        </div>
                    </RadioGroup>
                )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
          </div>

          <GradeDivisionSelector
            grade={watch("grade")}
            onGradeChange={(value) => setValue("grade", value)}
            division={watch("division")}
            onDivisionChange={(value) => setValue("division", value)}
          />
           {errors.grade && <p className="text-sm text-destructive mt-1">{errors.grade.message}</p>}
           {errors.division && <p className="text-sm text-destructive mt-1">{errors.division.message}</p>}

          <Button type="submit" className="w-full" disabled={isLoading || (currentSignupMethod === 'phone' && !otpSent)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
