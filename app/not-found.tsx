'use client';

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";

export default function NotFound() {
    const pathname = usePathname();

    useEffect(() => {
        console.error(
            "404 Error: User attempted to access non-existent route:",
            pathname
        );
    }, [pathname]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50">
            <div className="text-center max-w-md px-4">
                <div className="flex justify-center mb-6">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-3 rounded-lg">
                        <Scale className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h1 className="text-6xl font-bold text-slate-800 mb-2">404</h1>
                <h2 className="text-2xl font-semibold text-slate-700 mb-4">Page Not Found</h2>
                <p className="text-slate-600 mb-6">
                    The page you&#39;re looking for doesn&#39;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                    Return to Home
                </Link>
            </div>
        </div>
    );
}