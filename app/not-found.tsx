"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
            <div className="p-4 rounded-2xl bg-muted/50 mb-6">
                <FileQuestion className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h1>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
                <Button asChild className="bg-qualia-600 hover:bg-qualia-700">
                    <Link href="/">
                        <Home className="w-4 h-4 mr-2" />
                        Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
