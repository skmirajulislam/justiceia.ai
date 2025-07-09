"use client"
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Loader2, Trash2, Eye, Calendar, Scale, Tag, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getProfileAction } from '@/lib/database-actions';
import Navbar from '@/components/layout/Navbar';

const formSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters."),
    category: z.string().min(1, "Please select a category."),
    description: z.string().optional(),
    court: z.string().optional(),
    date: z.string().optional(),
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
    cloudinary_public_id?: string;
    court?: string;
    date?: string;
    tags: string[];
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
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            category: '',
            description: '',
            court: '',
            date: '',
        },
    });

    // Dropzone configuration
    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
                toast({
                    title: "Invalid File Type",
                    description: "Please select a PDF file.",
                    variant: "destructive",
                });
            } else if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
                toast({
                    title: "File Too Large",
                    description: "Please select a file smaller than 10MB.",
                    variant: "destructive",
                });
            }
            return;
        }

        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setSelectedFile(file);
            toast({
                title: "File Selected",
                description: `${file.name} is ready for upload.`,
            });
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        multiple: false
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

                if (!profileData.vkyc_completed) {
                    router.push('/vkyc');
                    return;
                }

                if (!['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(profileData.role ?? '')) {
                    toast({
                        title: "Access Denied",
                        description: "Only lawyers, barristers, and government officials can access this section.",
                        variant: "destructive",
                    });
                    router.push('/');
                    return;
                }

                await fetchReports();
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/auth');
            }
        };

        checkAuth();
    }, [session, loading, router, toast]);

    const fetchReports = async () => {
        if (!session) return;

        try {
            const response = await fetch(`/api/reports?userId=${session.user.id}`);

            if (response.ok) {
                const data = await response.json();
                setReports(data.reports || []);
            } else {
                console.warn('Unable to fetch reports:', response.status);
                setReports([]);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            setReports([]);
        }
    };

    const uploadPDF = async (file: File): Promise<{ url: string, publicId: string } | null> => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate upload progress (since we can't track real progress with fetch)
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();

            if (response.ok) {
                return {
                    url: data.url,
                    publicId: data.public_id
                };
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadProgress(0);
            return null;
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        setUploadProgress(0);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!session || !selectedFile) return;

        setIsLoading(true);

        try {
            const uploadResult = await uploadPDF(selectedFile);

            if (!uploadResult) {
                throw new Error('Failed to upload PDF file');
            }

            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: values.title,
                    category: values.category,
                    description: values.description,
                    court: values.court,
                    date: values.date,
                    pdf_url: uploadResult.url,
                    cloudinary_public_id: uploadResult.publicId,
                    tags: tags
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

            form.reset();
            setSelectedFile(null);
            setTags([]);
            setUploadProgress(0);
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

    const deleteReport = async (reportId: string, cloudinaryPublicId?: string) => {
        try {
            const params = new URLSearchParams({
                id: reportId,
                ...(cloudinaryPublicId && { publicId: cloudinaryPublicId })
            });

            const response = await fetch(`/api/reports?${params}`, {
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

    const viewPDF = (url: string) => {
        window.open(url, '_blank');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <div className="mt-3 pt-24 px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900">Publish Legal Report</h1>
                        <p className="text-slate-600 mt-2">Share your legal expertise with the community</p>
                        <div className="mt-4 p-4 bg-sky-50 rounded-lg">
                            <p className="text-sm text-sky-700">
                                <strong>Total Published Reports:</strong> {reports.length}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Publish New Report */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="mt-1 flex items-center space-x-2">
                                    <FileText className="w-5 h-5" />
                                    <span>New Report</span>
                                </CardTitle>
                                <CardDescription>
                                    Upload a new legal report to share with the community
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
                                                        <SelectContent className="max-h-60 overflow-auto">
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="court"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Court (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Supreme Court of India" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="date"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Case Date (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

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

                                        {/* Tags Section */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tags (Optional)</label>
                                            <div className="flex space-x-2">
                                                <Input
                                                    placeholder="Add a tag"
                                                    value={newTag}
                                                    onChange={(e) => setNewTag(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                />
                                                <Button type="button" variant="outline" onClick={addTag}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {tags.map((tag, index) => (
                                                        <Badge key={index} variant="secondary" className="text-xs">
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTag(tag)}
                                                                className="ml-1 hover:text-red-600"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Enhanced File Upload with Dropzone */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">PDF File</label>

                                            {!selectedFile ? (
                                                <div
                                                    {...getRootProps()}
                                                    className={`
                                                        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                                                        ${isDragActive && !isDragReject ? 'border-sky-400 bg-sky-50' : ''}
                                                        ${isDragReject ? 'border-red-400 bg-red-50' : ''}
                                                        ${!isDragActive ? 'border-gray-300 hover:border-sky-400 hover:bg-sky-50' : ''}
                                                    `}
                                                >
                                                    <input {...getInputProps()} />
                                                    <div className="space-y-4">
                                                        {isDragReject ? (
                                                            <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
                                                        ) : (
                                                            <Upload className={`w-12 h-12 mx-auto ${isDragActive ? 'text-sky-500' : 'text-slate-400'}`} />
                                                        )}

                                                        <div>
                                                            <p className={`text-lg font-medium ${isDragReject ? 'text-red-600' : isDragActive ? 'text-sky-600' : 'text-slate-600'}`}>
                                                                {isDragReject
                                                                    ? 'Invalid file type or size'
                                                                    : isDragActive
                                                                        ? 'Drop your PDF file here'
                                                                        : 'Drag & drop your PDF file here'
                                                                }
                                                            </p>
                                                            <p className="text-sm text-slate-500 mt-2">
                                                                or click to browse files
                                                            </p>
                                                        </div>

                                                        <div className="text-xs text-slate-400 space-y-1">
                                                            <p>• PDF files only</p>
                                                            <p>• Maximum file size: 10MB</p>
                                                            <p>• High-quality documents recommended</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border border-green-200 bg-green-50 rounded-lg p-6">
                                                    <div className="flex items-start space-x-4">
                                                        <div className="flex-shrink-0">
                                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-medium text-green-800">
                                                                File Ready for Upload
                                                            </h4>
                                                            <p className="text-sm text-green-700 mt-1 break-all">
                                                                {selectedFile.name}
                                                            </p>
                                                            <p className="text-xs text-green-600 mt-1">
                                                                Size: {formatFileSize(selectedFile.size)}
                                                            </p>

                                                            {/* Upload Progress */}
                                                            {isUploading && (
                                                                <div className="mt-3">
                                                                    <div className="flex justify-between text-xs text-green-600 mb-1">
                                                                        <span>Uploading...</span>
                                                                        <span>{uploadProgress}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-green-200 rounded-full h-2">
                                                                        <div
                                                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                                            style={{ width: `${uploadProgress}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={removeSelectedFile}
                                                            disabled={isUploading}
                                                            className="flex-shrink-0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
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
                                                    Uploading... {uploadProgress}%
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
                                <CardTitle>Your Published Reports ({reports.length})</CardTitle>
                                <CardDescription>
                                    Manage your published legal reports
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-96 overflow-y-auto">
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
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-slate-900 truncate">{report.title}</h3>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <Badge variant="outline" className="text-xs">{report.category}</Badge>
                                                            {report.court && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <Scale className="w-3 h-3 mr-1" />
                                                                    {report.court}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {report.description && (
                                                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                                                                {report.description}
                                                            </p>
                                                        )}
                                                        {report.tags && report.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {report.tags.slice(0, 3).map((tag, index) => (
                                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                                        <Tag className="w-3 h-3 mr-1" />
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                                {report.tags.length > 3 && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        +{report.tags.length - 3} more
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-3">
                                                            <div className="flex items-center space-x-4">
                                                                <span className="text-xs text-slate-400">
                                                                    <Calendar className="w-3 h-3 inline mr-1" />
                                                                    {new Date(report.created_at).toLocaleDateString()}
                                                                </span>
                                                                {report.date && (
                                                                    <span className="text-xs text-slate-400">
                                                                        Case: {new Date(report.date).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => viewPDF(report.pdf_url)}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => deleteReport(report.id, report.cloudinary_public_id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
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