
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const teacherProfileSchema = z.object({
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  whatsAppNumber: z.string().optional().refine(val => {
    if (!val) return true; // Optional field
    return /^\+[1-9]\d{1,14}$/.test(val); // Basic E.164 format check
  }, "Invalid WhatsApp number. Must be in international format (e.g., +91XXXXXXXXXX)."),
});

type TeacherProfileFormValues = z.infer<typeof teacherProfileSchema>;

export function TeacherProfileForm() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeacherProfileFormValues>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: {
      displayName: "",
      whatsAppNumber: "",
    }
  });

  useEffect(() => {
    if (user) {
      // Fetch whatsAppNumber from user's document in 'users' collection
      const userDocRef = doc(db, "users", user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          reset({
            displayName: user.displayName || "",
            whatsAppNumber: userData.whatsAppNumber || "",
          });
        } else {
          reset({
            displayName: user.displayName || "",
            whatsAppNumber: "",
          });
        }
      });
    }
  }, [user, reset]);

  const onSubmit: SubmitHandler<TeacherProfileFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const updatesToAuthUser: { displayName?: string } = {};
      if (data.displayName !== user.displayName) {
        updatesToAuthUser.displayName = data.displayName;
      }

      // Update Firebase Authentication display name if changed
      if (auth.currentUser && Object.keys(updatesToAuthUser).length > 0) {
        await updateAuthProfile(auth.currentUser, updatesToAuthUser);
      }

      // Update Firestore 'users' collection with displayName and whatsAppNumber
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { 
        displayName: data.displayName,
        whatsAppNumber: data.whatsAppNumber || null, // Save as null if empty
       }, { merge: true });
      
      // Update user in AuthContext
      setUser(prevUser => {
        if (!prevUser) return null;
        return { 
          ...prevUser, 
          displayName: data.displayName,
          whatsAppNumber: data.whatsAppNumber || null,
        };
      });

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Teacher profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Teacher Profile</CardTitle>
        <CardDescription>Manage your account details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" {...register("displayName")} />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <Label htmlFor="whatsAppNumber">WhatsApp Number (for notifications)</Label>
            <Input id="whatsAppNumber" {...register("whatsAppNumber")} placeholder="+91XXXXXXXXXX" />
            {errors.whatsAppNumber && <p className="text-sm text-destructive mt-1">{errors.whatsAppNumber.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">Enter with country code (e.g., +91 for India). This will be used for important notifications.</p>
          </div>

          <div>
            <Label htmlFor="email">Email (cannot be changed)</Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted/50"/>
          </div>
          
          <div>
            <Label htmlFor="role">Role (cannot be changed)</Label>
            <Input id="role" value={user?.role || ""} disabled className="bg-muted/50"/>
          </div>

          {user?.role === 'teacher' && (
            <>
              <div>
                <Label htmlFor="grade">Assigned Grade (cannot be changed here)</Label>
                <Input id="grade" value={user?.grade || "N/A"} disabled className="bg-muted/50"/>
              </div>
              <div>
                <Label htmlFor="division">Assigned Division (cannot be changed here)</Label>
                <Input id="division" value={user?.division || "N/A"} disabled className="bg-muted/50"/>
              </div>
               <p className="text-xs text-muted-foreground">Assigned grade and division are managed by administrators.</p>
            </>
          )}
        
          <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
