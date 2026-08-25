'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, BookOpen, Filter, Download, Eye, ExternalLink, FileText, Scale } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useToast } from '@/hooks/use-toast';

interface LegalDocument {
    id: string;
    title: string;
    category: string;
    description: string;
    pdf_url: string;
    created_at: string;
    date?: string;
    court?: string;
    tags: string[];
    author: {
        name: string;
        role: string;
        email: string;
        avatar_url?: string | null;
    };
}

const LegalLibrary = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<LegalDocument | null>(null);
    const { toast } = useToast();

    const categories = [
        'all',
        'Constitutional Law',
        'Criminal Law',
        'Contract Law',
        'Civil Law',
        'Corporate Law',
        'Labor Law',
        'Tax Law',
        'Property Law',
        'Family Law',
        'Environmental Law',
        'Intellectual Property',
        'Administrative Law',
        'Other'
    ];

    useEffect(() => {
        fetchDocuments();
    }, [selectedCategory, searchQuery]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedCategory !== 'all') {
                params.append('category', selectedCategory);
            }
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const response = await fetch(`/api/reports?${params}`);

            if (response.ok) {
                const data = await response.json();
                setDocuments(data.reports || []);
            } else {
                // Handle error response gracefully
                console.warn('API returned error status:', response.status);
                setDocuments([]);

                if (response.status >= 500) {
                    toast({
                        title: "Service Temporarily Unavailable",
                        description: "Unable to load documents at the moment. Please try again later.",
                        variant: "destructive",
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            setDocuments([]);

            // Only show toast for network errors, not for empty data
            toast({
                title: "Connection Error",
                description: "Unable to connect to the service. Please check your internet connection.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = (doc: LegalDocument) => {
        setViewingDoc(doc);
    };

    const handleDownloadDocument = async (pdfUrl: string, title: string) => {
        try {
            toast({
                title: "Starting Download",
                description: `Downloading ${title}...`,
            });

            const downloadEndpoint = `/api/documents/download-file?url=${encodeURIComponent(pdfUrl)}&filename=${encodeURIComponent(title)}`;
            const response = await fetch(downloadEndpoint);
            
            if (!response.ok) {
                // Direct fetch fallback if proxy has issues
                const directRes = await fetch(pdfUrl);
                if (!directRes.ok) throw new Error('Download failed');
                const blob = await directRes.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const sanitizedTitle = (title || 'document').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${sanitizedTitle}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            } else {
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const sanitizedTitle = (title || 'document').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${sanitizedTitle}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            }

            toast({
                title: "Download Complete",
                description: `${title}.pdf saved successfully.`,
            });
        } catch (error) {
            console.error('Download error:', error);
            // Final fallback: use iframe/download anchor
            const link = document.createElement('a');
            link.href = `/api/documents/download-file?url=${encodeURIComponent(pdfUrl)}&filename=${encodeURIComponent(title)}`;
            link.download = `${title}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const getAuthorInitials = (name: string) => {
        if (!name) return 'UN';
        const parts = name.split(' ');
        return parts.length > 1
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'lawyer': return 'bg-blue-100 text-blue-800';
            case 'barrister': return 'bg-purple-100 text-purple-800';
            case 'government_official': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
                <Navbar />
                <div className="container mx-auto px-4 pt-20 pb-8">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
            <Navbar />
            <div className="container mx-auto px-4 pt-20 pb-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <BookOpen className="w-8 h-8 text-sky-500" />
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Legal Library</h1>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">Comprehensive collection of legal documents, case laws, and reports from verified professionals</p>
                    </div>

                    {/* Search and Filter Section */}
                    <Card className="mb-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                                    <Input
                                        placeholder="Search legal documents, case laws, reports..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        {categories.map(category => (
                                            <option key={category} value={category} className="text-sm bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200">
                                                {category === 'all' ? 'All Categories' : category}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents Grid */}
                    {documents.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {documents.map((doc) => (
                                <Card key={doc.id} className="hover:shadow-lg dark:hover:shadow-slate-950/60 transition-shadow border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{doc.category}</Badge>
                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(doc.created_at).getFullYear()}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg line-clamp-2 text-slate-900 dark:text-white">{doc.title}</CardTitle>
                                        {doc.court && (
                                            <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                                                {doc.court}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {doc.description && (
                                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-3">{doc.description}</p>
                                        )}

                                        {/* Author Information */}
                                        <div className="flex items-center space-x-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg">
                                            <Avatar className="w-8 h-8">
                                                {doc.author.avatar_url && (
                                                    <AvatarImage src={doc.author.avatar_url} alt={doc.author.name} />
                                                )}
                                                <AvatarFallback className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                                                    {getAuthorInitials(doc.author.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {doc.author.name || 'Anonymous'}
                                                </p>
                                                <div className="flex items-center space-x-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs px-2 py-0.5 ${getRoleBadgeColor(doc.author.role)}`}
                                                    >
                                                        {doc.author.role?.replace('_', ' ') || 'Professional'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {doc.tags && doc.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                {doc.tags.slice(0, 3).map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {doc.tags.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        +{doc.tags.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                onClick={() => handleViewDocument(doc)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                onClick={() => handleDownloadDocument(doc.pdf_url, doc.title)}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>

                                        {/* Date Information */}
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                                <span>Published: {new Date(doc.created_at).toLocaleDateString()}</span>
                                                {doc.date && (
                                                    <span>Case Date: {new Date(doc.date).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">No Documents Available</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {searchQuery || selectedCategory !== 'all'
                                    ? 'No documents found matching your search criteria. Try adjusting your search terms or category filter.'
                                    : 'No legal documents have been published yet. Check back later or be the first to contribute!'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Large Interactive PDF Reader Popup Modal */}
            {viewingDoc && (
                <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
                    <DialogContent className="max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-4 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
                        <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800">
                                            {viewingDoc.category}
                                        </Badge>
                                        {viewingDoc.court && (
                                            <Badge variant="secondary" className="text-xs">
                                                {viewingDoc.court}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            Published {new Date(viewingDoc.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                        {viewingDoc.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <span>Author: <strong className="text-slate-800 dark:text-slate-200">{viewingDoc.author.name}</strong> ({viewingDoc.author.role?.replace('_', ' ') || 'Lawyer'})</span>
                                    </DialogDescription>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(viewingDoc.pdf_url, '_blank')}
                                        className="h-8 px-3 text-xs flex items-center gap-1.5 border-slate-200 dark:border-slate-700"
                                        title="Open PDF in new browser tab"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Full Tab
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleDownloadDocument(viewingDoc.pdf_url, viewingDoc.title)}
                                        className="h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Download
                                    </Button>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* PDF Viewport Container */}
                        <div className="flex-1 w-full relative min-h-0 pt-3 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden shadow-inner">
                            <iframe
                                src={`${viewingDoc.pdf_url}#toolbar=1&navpanes=0`}
                                title={viewingDoc.title}
                                className="w-full h-full rounded-lg border-0 bg-white dark:bg-slate-950"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default LegalLibrary;