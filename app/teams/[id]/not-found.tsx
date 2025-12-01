import Link from "next/link";
import { Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamNotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
            <div className="p-4 rounded-2xl bg-indigo-500/10 mb-6">
                <Users className="w-12 h-12 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Team Not Found</h1>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                This team doesn&apos;t exist or you don&apos;t have permission to view it.
            </p>
            <Button asChild className="bg-qualia-600 hover:bg-qualia-700">
                <Link href="/teams">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Teams
                </Link>
            </Button>
        </div>
    );
}
