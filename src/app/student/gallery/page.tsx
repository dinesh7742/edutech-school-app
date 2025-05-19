
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { PhotoGalleryAlbum } from "@/types";

export default function StudentGalleryPage() {
  const [galleryEvents, setGalleryEvents] = useState<PhotoGalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGalleryAlbums = async () => {
      setLoading(true);
      setError(null);
      // console.log("[StudentGalleryPage] Attempting to fetch gallery albums from Firestore...");
      try {
        const albumsCollectionRef = collection(db, "galleryAlbums");
        const q = query(albumsCollectionRef, orderBy("timestamp", "desc"));
        // console.log("[StudentGalleryPage] Executing Firestore query for gallery albums:", q);
        const querySnapshot = await getDocs(q);

        // console.log(`[StudentGalleryPage] Firestore query successful. Found ${querySnapshot.docs.length} documents.`);
        if (querySnapshot.empty) {
          // console.warn("[StudentGalleryPage] No gallery albums found in the 'galleryAlbums' collection.");
        }

        const fetchedAlbums: PhotoGalleryAlbum[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // console.log(`[StudentGalleryPage] Mapping document ${doc.id}:`, data);
          
          const imagesArray = Array.isArray(data.images) ? data.images : [];

          if (!data.title) { 
            // console.warn(`[StudentGalleryPage] Document ${doc.id} is missing title and will be skipped.`, data);
            return null;
          }

          const albumTitleForPlaceholders = (data.title || "Photo").toLowerCase().split(/\s+/).slice(0, 2).join(" ") || "Photo";

          return {
            id: doc.id,
            title: data.title,
            description: data.description || "",
            images: imagesArray.map((img: any, idx: number) => {
              let currentUrl = img.url;
              const defaultPlaceholder = `https://placehold.co/300x300.png?text=${encodeURIComponent(albumTitleForPlaceholders + ' ' + (idx + 1))}`;

              if (typeof currentUrl === 'string' && (currentUrl.includes('google.com/imgres') || currentUrl.includes('google.com/search'))) {
                // console.warn(`[StudentGalleryPage] Detected Google Image search/result URL: ${currentUrl}. Replacing with placeholder. Please use direct image URLs.`);
                currentUrl = defaultPlaceholder;
              } else if (!currentUrl || typeof currentUrl !== 'string') {
                // console.warn(`[StudentGalleryPage] Invalid or missing URL for image in album "${data.title}". Using placeholder.`);
                currentUrl = defaultPlaceholder;
              }
              
              return {
                url: currentUrl,
                alt: img.alt || `${data.title || 'Gallery Image'} - Image ${idx + 1}`,
              };
            }),
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            eventDate: data.eventDate || undefined,
            timestamp: data.timestamp as Timestamp,
          };
        }).filter(Boolean) as PhotoGalleryAlbum[]; 

        setGalleryEvents(fetchedAlbums);
        // console.log(`[StudentGalleryPage] Successfully mapped ${fetchedAlbums.length} gallery albums to state:`, fetchedAlbums);

      } catch (err: any) {
        console.error("[StudentGalleryPage] Error fetching gallery albums from Firestore:", err);
        setError(`Failed to load gallery albums: ${err.message}. Please check the console for more details.`);
        setGalleryEvents([]);
      } finally {
        setLoading(false);
        // console.log("[StudentGalleryPage] Finished fetching gallery albums. Loading set to false.");
      }
    };

    fetchGalleryAlbums();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <ImageIcon className="h-8 w-8" />
          Photo Gallery
        </h1>
        <Card className="shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please check your internet connection or Firestore security rules.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const generateAiHint = (title: string): string => {
    if (!title) return "gallery image";
    const words = title.toLowerCase().split(/\s+/).slice(0, 2); 
    return words.join(" ");
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <ImageIcon className="h-8 w-8" />
        Photo Gallery
      </h1>
      
      {galleryEvents.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No photos available in the gallery at the moment.</p>
      ) : (
        galleryEvents.map(event => (
          <Card key={event.id} className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{event.title}</CardTitle>
              <CardDescription>
                {event.eventDate && `Event Date: ${new Date(event.eventDate + 'T00:00:00').toLocaleDateString()}`} <br/>
                {event.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(event.images && event.images.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {event.images.map((img, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                      <NextImage 
                        src={img.url} 
                        alt={img.alt || event.title} 
                        width={300} 
                        height={300} 
                        className="w-full h-full object-cover"
                        data-ai-hint={generateAiHint(event.title)} 
                        onError={(e) => {
                          // console.warn(`[StudentGalleryPage] NextImage onError for URL: ${img.url}. Replacing with placeholder.`);
                          const target = e.target as HTMLImageElement;
                          const albumTitleForPlaceholders = (event.title || "Photo").toLowerCase().split(/\s+/).slice(0, 2).join(" ") || "Photo";
                          target.src = `https://placehold.co/300x300.png?text=${encodeURIComponent(albumTitleForPlaceholders + ' ' + (idx + 1))}`;
                          target.srcset = ""; 
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No images have been uploaded for this album yet.</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
