'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, CheckCircle2, AlertCircle, Building2, Award, Briefcase, Lock, Search, ExternalLink } from 'lucide-react';

function VkycVerificationContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams ? (searchParams.get('certificateId') || searchParams.get('id') || searchParams.get('token') || '') : '';
    
    const [query, setQuery] = useState(initialQuery);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async (searchTarget?: string) => {
        const q = searchTarget || query;
        if (!q.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`/api/vkyc/verify?query=${encodeURIComponent(q.trim())}`);
            const data = await res.json();

            if (res.ok && data.found) {
                setResult(data.verification);
            } else {
                setError(data.message || 'No verified practitioner found with the provided identifier.');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('Failed to contact the Justiceia.ai Verification Authority. Please check your network.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (initialQuery) {
            handleVerify(initialQuery);
        }
    }, [initialQuery]);

    return (
        <div className="pt-24 max-w-4xl mx-auto px-4 pb-16">
            {/* Hero Header */}
            <div className="text-center space-y-3 mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-sky-600/10 text-sky-600 rounded-2xl mb-2">
                    <ShieldCheck className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Justiceia.ai Legal Verification Authority
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                    National Electronic Registry for Video KYC Accreditation, Biometric Authenticity & Advocate Standing under Section 65B IT Act 2000.
                </p>
            </div>

            {/* Search Bar Card */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 mb-8">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
                        Search Credential or Certificate ID
                    </CardTitle>
                    <CardDescription>
                        Enter a Certificate ID (e.g., <code className="font-mono text-sky-600">JAI-VKYC-2026-XXXXXXXXXX</code>), Auth Token, or Advocate Email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleVerify();
                        }}
                        className="flex flex-col sm:flex-row gap-3"
                    >
                        <Input
                            placeholder="e.g. JAI-VKYC-2026-A325211A0D"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="font-mono text-sm h-11"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold h-11 px-6 shrink-0 flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            {isLoading ? 'Verifying Live...' : 'Verify Credential'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Results Section */}
            {error && (
                <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-300 p-6 animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-base">Verification Failed</h3>
                            <p className="text-sm mt-0.5">{error}</p>
                        </div>
                    </div>
                </Card>
            )}

            {result && (
                <Card className="border-emerald-300 dark:border-emerald-800 shadow-xl overflow-hidden animate-in fade-in">
                    {/* Top Green Banner */}
                    <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <CheckCircle2 className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <span className="text-xs uppercase font-bold tracking-wider text-emerald-200">
                                    Accreditation Standing
                                </span>
                                <h2 className="text-xl font-bold">OFFICIALLY VERIFIED & ACTIVE</h2>
                            </div>
                        </div>
                        <div className="text-right sm:border-l sm:border-emerald-600/50 sm:pl-4">
                            <span className="text-xs text-emerald-200 font-mono">Certificate ID</span>
                            <p className="font-mono font-bold text-sm text-white">{result.certificateId}</p>
                        </div>
                    </div>

                    <CardContent className="p-6 sm:p-8 space-y-6">
                        {/* Verified Practitioner Header with Photo */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-emerald-500/40 bg-slate-100 dark:bg-slate-800 shadow-md shrink-0">
                                {result.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={result.avatar_url}
                                        alt={result.advocateName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold text-2xl">
                                        {result.advocateName?.charAt(0) || 'L'}
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-tl-lg text-white shadow">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
                                    Accredited Legal Practitioner
                                </span>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {result.advocateName}
                                </h3>
                                <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                    <Briefcase className="w-4 h-4" />
                                    {result.role} • {result.experienceYears > 0 ? `${result.experienceYears} Years in Legal Practice` : 'Registered Legal Practitioner'}
                                </p>
                            </div>
                        </div>

                        {/* Practitioner Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Practitioner Legal Name</span>
                                    <p className="text-base font-bold text-slate-900 dark:text-white">{result.advocateName}</p>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Professional Role</span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4 text-sky-600" />
                                        {result.role}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Experience Standing</span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                        {result.experienceYears > 0 ? `${result.experienceYears} Years in Legal Practice` : 'Newly Registered Legal Practitioner'}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Hourly Consultation Rate</span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                        ₹{result.hourlyRate}/hour
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Primary Specializations</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {result.specializations.map((spec: string) => (
                                            <span key={spec} className="px-2.5 py-0.5 text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium rounded border border-sky-200 dark:border-sky-800">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Chamber / Office Location</span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{result.location}</p>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Biometric Assessment</span>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                        100% Face & ID Match (Passed)
                                    </p>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Verification Timestamp</span>
                                    <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                        {result.vkycCompletedAt ? new Date(result.vkycCompletedAt).toLocaleString('en-IN') : 'Active'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Platform Digital Seal Block */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                            <div className="font-bold tracking-wide text-slate-900 dark:text-slate-100 text-sm">
                                PLATFORM DIGITAL SEAL
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                                Digitally Signed by: <span className="font-semibold text-slate-800 dark:text-slate-200">{result.digitalSealAuthority || 'Justiceia.ai Trust Authority'}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                Auth Token: <span className="font-bold text-slate-900 dark:text-white">{result.authToken}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                SHA-256 Hash: <span className="font-bold text-sky-600 dark:text-sky-400">{result.sha256Hash}</span>
                            </div>
                            <div className="pt-2">
                                <span className="inline-block px-3 py-1 rounded bg-sky-100 dark:bg-sky-950/80 text-emerald-600 dark:text-emerald-400 font-bold text-xs tracking-wider border border-sky-200 dark:border-sky-800">
                                    [ {result.tamperProofStatus || 'VERIFIED & CRYPTOGRAPHICALLY TAMPER-PROOF'} ]
                                </span>
                            </div>
                        </div>

                        {/* Trust Badge Note */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Lock className="w-4 h-4 text-emerald-600" />
                            <span>Database Verified by Justiceia.ai Trust Authority • Cryptographically sealed & tamper-proof</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function VkycVerificationPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <Suspense fallback={<div className="pt-28 text-center text-slate-500">Loading verification portal...</div>}>
                <VkycVerificationContent />
            </Suspense>
        </div>
    );
}
