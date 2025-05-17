
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudentProfile } from "@/types";
import { Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";

const religionOptions = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  motherName: z.string().optional(),
  dateOfBirth: z.string().optional().refine((val) => {
    if (!val) return true; // Optional field
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, "Invalid date format. Use YYYY-MM-DD"),
  gender: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
  division: z.string().min(1, "Division is required"),
  contactNumber: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), "Must be 10 digits"),
  aadharCardNumber: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), "Must be 12 digits"),
  penNumber: z.string().optional(),
  grNumber: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  fullAddress: z.string().optional(),
  photoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface MySelfFormProps {
  studentIdForEdit?: string; // If provided, teacher is editing this student
  onSaveSuccess?: () => void; // Callback for teacher view to refresh
  isTeacherEditing?: boolean; // To adjust UI/toast messages
}

export function MySelfForm({ studentIdForEdit, onSaveSuccess, isTeacherEditing = false }: MySelfFormProps) {
  const { user: loggedInUser } = useAuth(); // This is the logged-in user (student or teacher)
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const defaultPhotoPlaceholder = studentIdForEdit 
    ? `https://placehold.co/128x128.png?text=Edit+Student`
    : `https://placehold.co/128x128.png?text=My+Photo`;


  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { // Initial default values
        firstName: "",
        lastName: "",
        grade: "1", // Default grade
        division: "A", // Default division
        photoUrl: defaultPhotoPlaceholder,
        // other fields will be empty or use their Zod defaults
    }
  });

  useEffect(() => {
    const profileUidToFetch = studentIdForEdit || loggedInUser?.uid;

    if (profileUidToFetch) {
      const fetchProfile = async () => {
        setIsFetchingProfile(true);
        const profileDocRef = doc(db, "studentProfiles", profileUidToFetch);
        const profileDoc = await getDoc(profileDocRef);
        
        const userDocRef = doc(db, "users", profileUidToFetch); // Fetch from 'users' for grade/division fallback
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        if (profileDoc.exists()) {
          const data = profileDoc.data() as StudentProfile;
          reset({ 
            firstName: data.firstName || "",
            middleName: data.middleName || "",
            lastName: data.lastName || "",
            motherName: data.motherName || "",
            dateOfBirth: data.dateOfBirth || "",
            gender: data.gender || "",
            grade: data.grade || userData.grade || "1", // Prioritize profile, then user, then default
            division: data.division || userData.division || "A",
            contactNumber: data.contactNumber || "",
            aadharCardNumber: data.aadharCardNumber || "",
            penNumber: data.penNumber || "",
            grNumber: data.grNumber || "",
            religion: data.religion || "",
            caste: data.caste || "",
            fullAddress: data.fullAddress || "",
            photoUrl: data.photoUrl || defaultPhotoPlaceholder,
          });
          setPhotoPreview(data.photoUrl || defaultPhotoPlaceholder);
        } else {
          // Pre-fill from 'users' collection if studentProfile doesn't exist
          // This is more relevant if a teacher is creating/editing a sparse profile
          const nameParts = userData.displayName?.split(" ") || loggedInUser?.displayName?.split(" ") || [];
          reset({
            firstName: nameParts[0] || "",
            lastName: nameParts.length > 1 ? nameParts[nameParts.length -1] : "",
            grade: userData.grade || loggedInUser?.grade || "1",
            division: userData.division || loggedInUser?.division || "A",
            motherName: "",
            dateOfBirth: "",
            gender: "",
            contactNumber: "",
            aadharCardNumber: "",
            penNumber: "",
            grNumber: "",
            religion: "",
            caste: "",
            fullAddress: "",
            photoUrl: defaultPhotoPlaceholder,
          });
          setPhotoPreview(defaultPhotoPlaceholder);
        }
        setIsFetchingProfile(false);
      };
      fetchProfile();
    } else if (!isTeacherEditing) { // Only if student is editing their own profile and loggedInUser is null (should not happen with useRequireAuth)
        setIsFetchingProfile(false);
        toast({title: "Error", description: "Could not load user information.", variant: "destructive"});
    }
  }, [studentIdForEdit, loggedInUser, reset, defaultPhotoPlaceholder, isTeacherEditing, toast]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    const profileUidToSave = studentIdForEdit || loggedInUser?.uid;

    if (!profileUidToSave) {
      toast({ title: "Error", description: "User ID not found. Cannot save profile.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    // Fetch student's email from 'users' collection to store in 'studentProfiles'
    // This is important if the email isn't part of the StudentProfile type yet from auth.
    let studentEmail = "";
    if (isTeacherEditing || !loggedInUser?.email) { // If teacher is editing, or student's auth object doesn't have email
        const userDocRef = doc(db, "users", profileUidToSave);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            studentEmail = userDoc.data().email || "";
        }
    } else {
        studentEmail = loggedInUser?.email || "";
    }


    try {
      const profileData: StudentProfile = {
        uid: profileUidToSave,
        email: studentEmail, // Store the student's actual email
        ...data, // grade and division are now part of 'data' from the form
        photoUrl: data.photoUrl === defaultPhotoPlaceholder ? "" : data.photoUrl || "",
      };

      await setDoc(doc(db, "studentProfiles", profileUidToSave), profileData, { merge: true });

      toast({
        title: isTeacherEditing ? "Student Profile Updated" : "Profile Updated",
        description: "Information has been saved successfully.",
      });
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const watchedPhotoUrl = watch("photoUrl");
  useEffect(() => {
    if (watchedPhotoUrl && watchedPhotoUrl.startsWith('http')) {
      setPhotoPreview(watchedPhotoUrl);
    } else if (!watchedPhotoUrl) {
      setPhotoPreview(defaultPhotoPlaceholder);
    }
  }, [watchedPhotoUrl, defaultPhotoPlaceholder]);


  if (isFetchingProfile) { 
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>{isTeacherEditing ? "Edit Student Profile" : "My Profile"}</CardTitle>
          <CardDescription>Loading information...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">
          {isTeacherEditing ? "Edit Student Profile" : "My Profile"}
        </CardTitle>
        <CardDescription>
            {isTeacherEditing ? "Modify the student's information below." : "Keep your information up to date. Fields marked with * are required."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" {...register("middleName")} />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input id="motherName" {...register("motherName")} />
              {errors.motherName && <p className="text-sm text-destructive mt-1">{errors.motherName.message}</p>}
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="text-sm text-destructive mt-1">{errors.dateOfBirth.message}</p>}
            </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
             <div>
              <Label htmlFor="gender">Gender</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
            </div>
             <div>
              <Label htmlFor="photoUrl">Photo URL</Label>
              <Input 
                id="photoUrl" 
                {...register("photoUrl")} 
                placeholder={defaultPhotoPlaceholder}
                onChange={(e) => {
                  setValue("photoUrl", e.target.value);
                  if (e.target.value && e.target.value.startsWith('http')) {
                    setPhotoPreview(e.target.value);
                  } else {
                     setPhotoPreview(defaultPhotoPlaceholder); 
                  }
                }}
              />
               {errors.photoUrl && <p className="text-sm text-destructive mt-1">{errors.photoUrl.message}</p>}
              {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" width={128} height={128} className="mt-2 rounded-md object-cover h-32 w-32 border" data-ai-hint="profile photo"/>
              ) : (
                <div className="mt-2 flex items-center justify-center h-32 w-32 rounded-md border border-dashed bg-muted/50">
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Enter a direct URL to the photo.</p>
            </div>
          </div>
          
          <div>
             <Label>Grade & Division *</Label>
             <Controller
                name="grade"
                control={control}
                render={({ field: gradeField }) => (
                <Controller
                    name="division"
                    control={control}
                    render={({ field: divisionField }) => ( 
                    <GradeDivisionSelector
                        grade={gradeField.value || ""}
                        onGradeChange={gradeField.onChange}
                        division={divisionField.value || ""} 
                        onDivisionChange={divisionField.onChange}
                        showDivision={true}
                    />
                    )}
                />
                )}
            />
            {errors.grade && <p className="text-sm text-destructive mt-1">{errors.grade.message}</p>}
            {errors.division && <p className="text-sm text-destructive mt-1">{errors.division.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" {...register("contactNumber")} type="tel" placeholder="9876543210" />
              {errors.contactNumber && <p className="text-sm text-destructive mt-1">{errors.contactNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="aadharCardNumber">Aadhar Card Number</Label>
              <Input id="aadharCardNumber" {...register("aadharCardNumber")} placeholder="123456789012" />
              {errors.aadharCardNumber && <p className="text-sm text-destructive mt-1">{errors.aadharCardNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="penNumber">PEN Number</Label>
              <Input id="penNumber" {...register("penNumber")} />
            </div>
            <div>
              <Label htmlFor="grNumber">G.R. Number</Label>
              <Input id="grNumber" {...register("grNumber")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="religion">Religion</Label>
               <Controller
                name="religion"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger id="religion">
                      <SelectValue placeholder="Select religion" />
                    </SelectTrigger>
                    <SelectContent>
                      {religionOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="caste">Caste (if any)</Label>
              <Input id="caste" {...register("caste")} />
            </div>
          </div>

          <div>
            <Label htmlFor="fullAddress">Full Address</Label>
            <Textarea id="fullAddress" {...register("fullAddress")} placeholder="123 Main St, Your City, Your State, PIN" />
          </div>

          <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isFetchingProfile}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
