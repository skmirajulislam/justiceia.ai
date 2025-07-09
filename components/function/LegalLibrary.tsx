'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, BookOpen, Filter, Download, Eye } from 'lucide-react';
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
    };
}

const LegalLibrary = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [loading, setLoading] = useState(true);
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

    const handleViewDocument = (pdfUrl: string) => {
        window.open(pdfUrl, '_blank');
    };

    const handleDownloadDocument = (pdfUrl: string, title: string) => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${title}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="container mx-auto px-4 pt-20 pb-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <BookOpen className="w-8 h-8 text-sky-500" />
                            <h1 className="text-3xl font-bold text-slate-900">Legal Library</h1>
                        </div>
                        <p className="text-slate-600">Comprehensive collection of legal documents, case laws, and reports from verified professionals</p>
                    </div>

                    {/* Search and Filter Section */}
                    <Card className="mb-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search legal documents, case laws, reports..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Filter className="w-4 h-4 text-slate-500" />
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        {categories.map(category => (
                                            <option key={category} value={category} className="text-sm text-slate-700">
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
                                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline">{doc.category}</Badge>
                                            <span className="text-sm text-slate-500">
                                                {new Date(doc.created_at).getFullYear()}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                                        {doc.court && (
                                            <CardDescription className="text-sm text-slate-600">
                                                {doc.court}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {doc.description && (
                                            <p className="text-sm text-slate-700 mb-4 line-clamp-3">{doc.description}</p>
                                        )}

                                        {/* Author Information */}
                                        <div className="flex items-center space-x-3 mb-4 p-3 bg-slate-50 rounded-lg">
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className="text-xs">
                                                    {getAuthorInitials(doc.author.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
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
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {doc.tags.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs">
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
                                                className="flex-1"
                                                onClick={() => handleViewDocument(doc.pdf_url)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => handleDownloadDocument(doc.pdf_url, doc.title)}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>

                                        {/* Date Information */}
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <div className="flex justify-between items-center text-xs text-slate-500">
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
                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-600 mb-2">No Documents Available</h3>
                            <p className="text-slate-500 text-sm">
                                {searchQuery || selectedCategory !== 'all'
                                    ? 'No documents found matching your search criteria. Try adjusting your search terms or category filter.'
                                    : 'No legal documents have been published yet. Check back later or be the first to contribute!'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LegalLibrary;