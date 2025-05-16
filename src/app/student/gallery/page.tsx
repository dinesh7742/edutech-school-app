"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import NextImage from "next/image"; // Renamed to avoid conflict with Lucide icon

// Mock data - replace with actual data fetching
const mockGalleryEvents = [
  { 
    id: "1", 
    title: "Annual Day Celebration 2023", 
    date: "2023-12-15",
    description: "A glimpse of the vibrant performances and joyful moments from our Annual Day.",
    images: Array(8).fill(null).map((_, i) => ({ url: `https://placehold.co/600x400.png?id=annual${i}`, alt: `Annual Day photo ${i+1}` })),
    dataAiHint: "school event"
  },
  { 
    id: "2", 
    title: "Science Exhibition", 
    date: "2024-02-10",
    description: "Students showcasing their innovative science projects and experiments.",
    images: Array(6).fill(null).map((_, i) => ({ url: `https://placehold.co/600x400.png?id=sci${i}`, alt: `Science Exhibition photo ${i+1}`})),
    dataAiHint: "science fair"
  },
   { 
    id: "3", 
    title: "Sports Meet Highlights", 
    date: "2024-03-05",
    description: "Action-packed moments from the inter-house sports competition.",
    images: Array(10).fill(null).map((_, i) => ({ url: `https://placehold.co/600x400.png?id=sports${i}`, alt: `Sports Meet photo ${i+1}`})),
    dataAiHint: "school sports"
  },
];

export default function StudentGalleryPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <ImageIcon className="h-8 w-8" />
        Photo Gallery
      </h1>
      
      {mockGalleryEvents.map(event => (
        <Card key={event.id} className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{event.title}</CardTitle>
            <CardDescription>
              Event Date: {event.date} <br/>
              {event.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {event.images.map((img, idx) => (
                <div key={idx} className="aspect-square overflow-hidden rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  <NextImage 
                    src={img.url} 
                    alt={img.alt || event.title} 
                    width={300} 
                    height={300} 
                    className="w-full h-full object-cover"
                    data-ai-hint={event.dataAiHint} 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {mockGalleryEvents.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No photos available in the gallery at the moment.</p>
      )}
    </div>
  );
}
