
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";


interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  role: UserRole | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const appUser: AppUser = {
            ...firebaseUser,
            displayName: userData.displayName || firebaseUser.displayName,
            photoURL: userData.photoUrl || firebaseUser.photoURL, // Prioritize our Firestore photoUrl
            role: userData.role,
            grade: userData.grade,
            division: userData.division,
            whatsAppNumber: userData.whatsAppNumber,
            educationQualification: userData.educationQualification,
            subjectTaught: userData.subjectTaught,
            address: userData.address,
          };
          setUser(appUser);
          setRole(userData.role);
        } else {
           const basicAppUser: AppUser = { ...firebaseUser, displayName: firebaseUser.displayName };
           setUser(basicAppUser);
           setRole(null); 
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, role, setUser, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
