"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getProfileAction } from '@/lib/database-actions';
import Navbar from '@/components/layout/Navbar';

const formSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters."),
    category: z.string().min(1, "Please select a category."),
    description: z.string().optional(),
});

const LEGAL_CATEGORIES = [
    'Constitutional Law',
    'Criminal Law',
    'Civil Law',
    'Corporate Law',
    'Labor Law',
    'Tax Law',
    'Property Law',
    'Family Law',
    'Environmental Law',
    'Intellectual Property',
    'Contract Law',
    'Administrative Law',
    'Other'
];

interface Report {
    id: string;
    title: string;
    category: string;
    description?: string;
    pdf_url: string;
    created_at: string;
}

const PublishReport = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { session, loading } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            category: '',
            description: '',
        },
    });

    useEffect(() => {
        const checkAuth = async () => {
            if (loading) return;

            if (!session) {
                router.push('/auth');
                return;
            }

            try {
                const profileData = await getProfileAction(session.user.id);

                if (!profileData) {
                    router.push('/auth');
                    return;
                }

                setProfile(profileData);

                // Check if user has completed VKYC
                if (!profileData.vkyc_completed) {
                    router.push('/vkyc');
                    return;
                }

                // Check if user has the right role
                if (!['lawyer', 'barrister', 'government_official'].includes(profileData.role ?? '')) {
                    toast({
                        title: "Access Denied",
                        description: "Only lawyers, barristers, and government officials can access this section.",
                        variant: "destructive",
                    });
                    router.push('/');
                    return;
                }

                // Fetch user's reports
                await fetchReports();
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/auth');
            }
        };

        checkAuth();
    }, [session, loading, router, toast]);

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/reports');
            const data = await response.json();

            if (response.ok) {
                setReports(data.reports || []);
            } else {
                console.error('Error fetching reports:', data.error);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    const uploadPDF = async (file: File): Promise<string | null> => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                return data.url;
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!session || !selectedFile) return;

        setIsLoading(true);

        try {
            // Upload PDF file to Cloudinary
            const pdfUrl = await uploadPDF(selectedFile);

            if (!pdfUrl) {
                throw new Error('Failed to upload PDF file');
            }

            // Save report to database
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: values.title,
                    category: values.category,
                    description: values.description,
                    pdf_url: pdfUrl
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to publish report');
            }

            toast({
                title: "Report Published!",
                description: "Your legal report has been published successfully.",
            });

            // Reset form and refresh reports
            form.reset();
            setSelectedFile(null);
            await fetchReports();

        } catch (error: any) {
            console.error('Report publishing error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to publish report. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                toast({
                    title: "Invalid File Type",
                    description: "Please select a PDF file.",
                    variant: "destructive",
                });
                return;
            }

            // Check file size (limit to 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: "File Too Large",
                    description: "Please select a file smaller than 10MB.",
                    variant: "destructive",
                });
                return;
            }

            setSelectedFile(file);
        }
    };

    const deleteReport = async (reportId: string, pdfUrl: string) => {
        try {
            // Extract public ID from Cloudinary URL
            const urlParts = pdfUrl.split('/');
            const publicIdWithExt = urlParts[urlParts.length - 1];
            const publicId = `legal-reports/${session?.user.id}/${publicIdWithExt}`;

            const response = await fetch(`/api/reports?id=${reportId}&publicId=${encodeURIComponent(publicId)}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete report');
            }

            toast({
                title: "Report Deleted",
                description: "The report has been deleted successfully.",
            });

            await fetchReports();
        } catch (error: any) {
            console.error('Error deleting report:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete report. Please try again.",
                variant: "destructive",
            });
        }
    };

    if (loading || !session || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="pt-24 px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900">Publish Legal Report</h1>
                        <p className="text-slate-600 mt-2">Share your legal expertise with the community</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Publish New Report */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <FileText className="w-5 h-5" />
                                    <span>New Report</span>
                                </CardTitle>
                                <CardDescription>
                                    Upload a new legal report to share
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Report Title</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter report title" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {LEGAL_CATEGORIES.map((category) => (
                                                                <SelectItem key={category} value={category}>
                                                                    {category}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Brief description of the report"
                                                            rows={3}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">PDF File</label>
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                                                {selectedFile ? (
                                                    <div className="space-y-2">
                                                        <FileText className="w-12 h-12 mx-auto text-green-500" />
                                                        <p className="text-sm font-medium text-green-600">{selectedFile.name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedFile(null)}
                                                        >
                                                            Remove File
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <Upload className="w-12 h-12 mx-auto text-slate-400" />
                                                        <div>
                                                            <label className="cursor-pointer">
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf"
                                                                    onChange={handleFileChange}
                                                                    className="hidden"
                                                                />
                                                                <Button type="button" variant="outline">
                                                                    Choose PDF File
                                                                </Button>
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            Upload your legal report in PDF format (Max 10MB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={isLoading || isUploading || !selectedFile}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Publishing...
                                                </>
                                            ) : isUploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                "Publish Report"
                                            )}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>

                        {/* Published Reports */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Published Reports</CardTitle>
                                <CardDescription>
                                    Manage your published legal reports
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {reports.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500">No reports published yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reports.map((report) => (
                                            <div key={report.id} className="border border-slate-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="font-medium text-slate-900">{report.title}</h3>
                                                        <p className="text-sm text-slate-600 mt-1">{report.category}</p>
                                                        {report.description && (
                                                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                                                                {report.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center space-x-4 mt-3">
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(report.created_at).toLocaleDateString()}
                                                            </span>
                                                            <a
                                                                href={report.pdf_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-sky-500 hover:underline"
                                                            >
                                                                View PDF
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => deleteReport(report.id, report.pdf_url)}
                                                        className="ml-4"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublishReport;