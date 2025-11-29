"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TeamsFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const currentSearch = searchParams.get("search") || "";
    const [searchValue, setSearchValue] = useState(currentSearch);

    const updateUrl = useCallback(
        (search: string) => {
            startTransition(() => {
                if (search) {
                    router.push(`${pathname}?search=${encodeURIComponent(search)}`);
                } else {
                    router.push(pathname);
                }
            });
        },
        [pathname, router]
    );

    const handleSearch = () => {
        updateUrl(searchValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleClear = () => {
        setSearchValue("");
        updateUrl("");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                    {currentSearch && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-qualia-600 text-white">
                            1
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3">
                <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                        Search by name
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Team name..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-8 bg-background border-border"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={handleSearch}
                            disabled={isPending}
                            className="flex-1 bg-qualia-600 hover:bg-qualia-500"
                        >
                            Apply
                        </Button>
                        {currentSearch && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
