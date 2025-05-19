
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  updateProfile,
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
import { Loader2 } from "lucide-react";

const signupSchema = z.object({
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "teacher"], { required_error: "Please select a role" }),
  grade: z.string().min(1, "Please select a grade"),
  division: z.string().min(1, "Please select a division"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: "student",
      grade: "1",
      division: "A",
      email: "",
      password: "",
      displayName: "",
    },
  });

  const selectedRole = watch("role");

  const saveUserToFirestore = async (user: FirebaseUser, data: SignupFormValues) => {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: data.email,
      phoneNumber: null, // Explicitly set to null as phone auth is removed
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
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: data.displayName });
      
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
          Join CampusConnect to access school resources using your email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="displayName">Full Name *</Label>
            <Input id="displayName" {...register("displayName")} placeholder="John Doe" />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

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

          <Button type="submit" className="w-full" disabled={isLoading}>
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
