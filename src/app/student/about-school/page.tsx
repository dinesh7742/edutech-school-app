
"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, MapPin, Mail, Phone, Info } from "lucide-react";
import Image from "next/image";

const schoolInfo = {
    name: "PM SHRI MPS VARSHA NAGAR",
    address: "Veer savarkar marg,Beside Prabodhankar Thakare Garden,Kailas complex, Varsha nagar bus stop Vikhroli west Mumbai - 79",
    udise: "27220600119",
    ward: "S ward",
    contact: "+917506137742",
    email: "varshanagarmps@gmail.com",
    logoUrl: "https://i.postimg.cc/8P0y0gxz/MCGM-Seal.jpg",
    imageUrl: "https://placehold.co/800x400.png?text=Our+School+Building"
};

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
        <div>
            <p className="font-semibold text-foreground">{label}</p>
            <p className="text-muted-foreground">{value}</p>
        </div>
    </div>
);

export default function AboutSchoolPage() {
  return (
    <div className="space-y-8">
        <div className="flex flex-col items-center text-center">
            <Image 
                src={schoolInfo.logoUrl} 
                alt="School Logo" 
                width={100} 
                height={100} 
                className="rounded-full mb-4"
                data-ai-hint="school logo"
            />
            <h1 className="text-4xl font-bold text-primary">{schoolInfo.name}</h1>
            <p className="text-lg text-muted-foreground mt-1">A Hub of Learning and Growth</p>
        </div>

        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>About Our School</CardTitle>
                <CardDescription>Get to know more about our institution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <Image 
                        src={schoolInfo.imageUrl}
                        alt="School Building"
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="school building"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <DetailItem icon={MapPin} label="Address" value={schoolInfo.address} />
                    <DetailItem icon={Phone} label="Contact Number" value={schoolInfo.contact} />
                    <DetailItem icon={Mail} label="Email Address" value={schoolInfo.email} />
                    <DetailItem icon={Info} label="UDISE Number" value={schoolInfo.udise} />
                    <DetailItem icon={Building} label="Ward" value={schoolInfo.ward} />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
