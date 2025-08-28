
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
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
import { Loader2 } from "lucide-react";


const emailSignupSchema = z.object({
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "teacher", "admin"], { required_error: "Please select a role" }),
  grade: z.string().optional(),
  division: z.string().optional(),
}).refine(data => {
    if (data.role === 'student' || data.role === 'teacher') {
        return !!data.grade && !!data.division;
    }
    return true;
}, {
    message: "Grade and Division are required for students and teachers.",
    path: ["grade"], // Attach error to a relevant field
});

type EmailSignupFormValues = z.infer<typeof emailSignupSchema>;


export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const emailForm = useForm<EmailSignupFormValues>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { role: "student", grade: "1", division: "A" }
  });

  const selectedRole = emailForm.watch("role");

  const saveUserToFirestore = async (user: FirebaseUser, data: EmailSignupFormValues) => {
    const userData: any = {
      uid: user.uid,
      email: data.email,
      phoneNumber: null,
      displayName: data.displayName,
      role: data.role,
      createdAt: new Date(),
    };
    if (data.role === 'student' || data.role === 'teacher') {
        userData.grade = data.grade;
        userData.division = data.division;
    }
    await setDoc(doc(db, "users", user.uid), userData);
  };

  const onEmailSubmit: SubmitHandler<EmailSignupFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: data.displayName });
      await saveUserToFirestore(user, data);
      
      toast({ title: "Signup Successful", description: "Welcome! Redirecting..." });
      let redirectPath = "/";
        switch (data.role) {
            case "student": redirectPath = "/student/dashboard"; break;
            case "teacher": redirectPath = "/teacher/dashboard"; break;
            case "admin": redirectPath = "/admin/dashboard"; break;
        }
      router.push(redirectPath);
    } catch (error: any) {
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Join CampusConnect to access school resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
             <div>
                <Label>I am a *</Label>
                <Controller name="role" control={emailForm.control} render={({field}) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4 mt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="student" id="student_email" /><Label htmlFor="student_email">Student</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="teacher" id="teacher_email" /><Label htmlFor="teacher_email">Teacher</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="admin" id="admin_email" /><Label htmlFor="admin_email">Admin</Label></div>
                    </RadioGroup>
                )} />
                {emailForm.formState.errors.role && <p className="text-sm text-destructive mt-1">{emailForm.formState.errors.role.message}</p>}
            </div>
            {(selectedRole === 'student' || selectedRole === 'teacher') && (
                <GradeDivisionSelector 
                    grade={emailForm.watch("grade") || '1'} 
                    onGradeChange={(v) => emailForm.setValue("grade", v)} 
                    division={emailForm.watch("division") || 'A'} 
                    onDivisionChange={(v) => emailForm.setValue("division", v)} 
                />
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign Up
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
    </>
  );
}
