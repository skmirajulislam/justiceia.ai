"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Download, Trash2, FileEdit, Brain, Languages, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useDropzone } from 'react-dropzone';

interface DocumentAnalysis {
    documentType: string;
    keyPoints: string[];
    legalConcerns: string[];
    recommendations: string[];
    summary: string;
}

interface AnalyzedDocument {
    id: string;
    name: string;
    type: string;
    size: string;
    uploadDate: Date;
    status: 'processing' | 'completed' | 'error';
    analysis?: DocumentAnalysis;
    fileContent?: string;
}

interface GeneratedDocument {
    id: string;
    title: string;
    type: string;
    description: string;
    content: string;
    createdDate: Date;
    status: 'generating' | 'completed' | 'error';
    isEditing?: boolean;
    editedContent?: string;
}

interface TranslatedDocument {
    id: string;
    name: string;
    originalLanguage: string;
    targetLanguage: string;
    translatedContent: string;
    uploadDate: Date;
    status: 'processing' | 'completed' | 'error';
    fileContent?: string;
}

const DocumentProcessor = () => {
    const { toast } = useToast();
    const { session, loading } = useAuth();
    const router = useRouter();

    const [activeSection, setActiveSection] = useState<'analyze' | 'generate' | 'translate'>('analyze');
    const [analyzedDocs, setAnalyzedDocs] = useState<AnalyzedDocument[]>([]);
    const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
    const [translatedDocs, setTranslatedDocs] = useState<TranslatedDocument[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(true);

    // Document Generation Form
    const [docType, setDocType] = useState('');
    const [docTitle, setDocTitle] = useState('');
    const [docDescription, setDocDescription] = useState('');
    const resultsRef = useRef<HTMLDivElement>(null);

    // Translation Form
    const [targetLanguage, setTargetLanguage] = useState('');
    const generatedSectionRef = useRef<HTMLDivElement>(null);
    const translatedSectionRef = useRef<HTMLDivElement>(null);


    // Legal document types
    const documentTypes = [
        { value: 'contract', label: 'Contract Agreement' },
        { value: 'nda', label: 'Non-Disclosure Agreement' },
        { value: 'employment', label: 'Employment Agreement' },
        { value: 'rental', label: 'Rental Agreement' },
        { value: 'service', label: 'Service Agreement' },
        { value: 'partnership', label: 'Partnership Agreement' },
        { value: 'terms', label: 'Terms of Service' },
        { value: 'privacy', label: 'Privacy Policy' },
        { value: 'invoice', label: 'Legal Invoice' },
        { value: 'notice', label: 'Legal Notice' }
    ];

    // Supported languages
    const languages = [
        { value: 'english', label: 'English' },
        { value: 'bengali', label: 'Bengali' },
        { value: 'hindi', label: 'Hindi' },
        { value: 'telugu', label: 'Telugu' },
        { value: 'tamil', label: 'Tamil' },
        { value: 'spanish', label: 'Spanish' },
        { value: 'chinese', label: 'Chinese' },
        { value: 'french', label: 'French' },
        { value: 'german', label: 'German' }
    ];

    useEffect(() => {
        const checkAuth = async () => {
            if (loading) return;

            if (!session) {
                router.push('/auth');
                return;
            }

            // Check for stored API key
            try {
                const storedApiKey = localStorage.getItem('gemini_api_key');
                if (storedApiKey) {
                    setApiKey(storedApiKey);
                    setShowApiKeyInput(false);
                }
            } catch (error) {
                console.error('Error checking stored API key:', error);
            }
        };

        checkAuth();
    }, [session, loading, router]);

    useEffect(() => {
        if (!isAnalyzing && analyzedDocs.length > 0) {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isAnalyzing, analyzedDocs]);

    useEffect(() => {
        if (!isGenerating && generatedDocs.length > 0) {
            setTimeout(() => {
            generatedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 200); // slight delay to ensure content is rendered
        }
    }, [isGenerating, generatedDocs]);

    useEffect(() => {
        if (!isTranslating && translatedDocs.length > 0) {
            setTimeout(() => {
            translatedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 200);
        }
    }, [isTranslating, translatedDocs]);

    const handleApiKeySubmit = () => {
        if (!apiKey.trim()) {
            toast({
                title: "API Key Required",
                description: "Please enter your Gemini API key to continue.",
                variant: "destructive",
            });
            return;
        }

        localStorage.setItem('gemini_api_key', apiKey);
        setShowApiKeyInput(false);

        toast({
            title: "API Key Saved",
            description: "You can now use AI document processing features!",
        });
    };

    // Convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result.split(',')[1]); // Remove data:mime;base64, prefix
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = error => reject(error);
        });
    };

    const analyzeDocument = async (fileContent: string, fileName: string): Promise<DocumentAnalysis | null> => {
        try {
            const response = await fetch('/api/documents/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileContent,
                    fileName,
                    apiKey
                }),
            });

            const data = await response.json();

            if (response.ok) {
                return data.analysis;
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            return null;
        }
    };

    // Analysis Dropzone
    const onDropAnalyze = useCallback(async (acceptedFiles: File[]) => {
        if (!apiKey) {
            toast({
                title: "API Key Required",
                description: "Please set your Gemini API key first.",
                variant: "destructive",
            });
            return;
        }

        setIsAnalyzing(true);

        for (const file of acceptedFiles) {
            const newDoc: AnalyzedDocument = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type.split('/')[1]?.toUpperCase() || file.name.split('.').pop()?.toUpperCase() || 'FILE',
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                uploadDate: new Date(),
                status: 'processing'
            };

            setAnalyzedDocs(prev => [newDoc, ...prev]);

            try {
                // Convert file to base64
                const fileContent = await fileToBase64(file);

                // Analyze with AI
                const analysis = await analyzeDocument(fileContent, file.name);

                if (analysis) {
                    setAnalyzedDocs(prev => prev.map(doc =>
                        doc.id === newDoc.id
                            ? {
                                ...doc,
                                status: 'completed',
                                analysis,
                                fileContent
                            }
                            : doc
                    ));

                    toast({
                        title: "Analysis Complete",
                        description: `${file.name} has been analyzed successfully`,
                    });
                } else {
                    throw new Error('Analysis failed');
                }
            } catch (error) {
                setAnalyzedDocs(prev => prev.map(doc =>
                    doc.id === newDoc.id
                        ? { ...doc, status: 'error' }
                        : doc
                ));

                toast({
                    title: "Analysis Failed",
                    description: `Failed to analyze ${file.name}. Please try again.`,
                    variant: "destructive",
                });
            }
        }

        setIsAnalyzing(false);
    }, [apiKey, toast]);

    // Translation Dropzone
    const onDropTranslate = useCallback(async (acceptedFiles: File[]) => {
        if (!apiKey) {
            toast({
                title: "API Key Required",
                description: "Please set your Gemini API key first.",
                variant: "destructive",
            });
            return;
        }

        if (!targetLanguage) {
            toast({
                title: "Language Required",
                description: "Please select a target language first.",
                variant: "destructive",
            });
            return;
        }

        setIsTranslating(true);

        for (const file of acceptedFiles) {
            const newDoc: TranslatedDocument = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: file.name,
                originalLanguage: 'auto-detect',
                targetLanguage,
                translatedContent: '',
                uploadDate: new Date(),
                status: 'processing'
            };

            setTranslatedDocs(prev => [newDoc, ...prev]);

            try {
                // Convert file to base64
                const fileContent = await fileToBase64(file);

                // Translate with AI
                const response = await fetch('/api/documents/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileContent,
                        fileName: file.name,
                        targetLanguage,
                        apiKey
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    setTranslatedDocs(prev => prev.map(doc =>
                        doc.id === newDoc.id
                            ? {
                                ...doc,
                                status: 'completed',
                                translatedContent: data.translatedContent,
                                originalLanguage: data.originalLanguage,
                                fileContent
                            }
                            : doc
                    ));

                    toast({
                        title: "Translation Complete",
                        description: `${file.name} has been translated successfully`,
                    });
                } else {
                    throw new Error(data.error || 'Translation failed');
                }
            } catch (error) {
                setTranslatedDocs(prev => prev.map(doc =>
                    doc.id === newDoc.id
                        ? { ...doc, status: 'error' }
                        : doc
                ));

                toast({
                    title: "Translation Failed",
                    description: `Failed to translate ${file.name}. Please try again.`,
                    variant: "destructive",
                });
            }
        }

        setIsTranslating(false);
    }, [apiKey, targetLanguage, toast]);

    const { getRootProps: getAnalyzeRootProps, getInputProps: getAnalyzeInputProps, isDragActive: isAnalyzeDragActive } = useDropzone({
        onDrop: onDropAnalyze,
        accept: {
            'application/pdf': ['.pdf']
        },
        multiple: true,
        disabled: isAnalyzing
    });

    const { getRootProps: getTranslateRootProps, getInputProps: getTranslateInputProps, isDragActive: isTranslateDragActive } = useDropzone({
        onDrop: onDropTranslate,
        accept: {
            'application/pdf': ['.pdf']
        },
        multiple: true,
        disabled: isTranslating
    });

    const generateDocument = async () => {
        if (!apiKey) {
            toast({
                title: "API Key Required",
                description: "Please set your Gemini API key first.",
                variant: "destructive",
            });
            return;
        }

        if (!docType || !docTitle || !docDescription) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);

        const newDoc: GeneratedDocument = {
            id: Date.now().toString(),
            title: docTitle,
            type: docType,
            description: docDescription,
            content: '',
            createdDate: new Date(),
            status: 'generating'
        };

        setGeneratedDocs(prev => [newDoc, ...prev]);

        try {
            const response = await fetch('/api/documents/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: docType,
                    title: docTitle,
                    description: docDescription,
                    apiKey
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setGeneratedDocs(prev => prev.map(doc =>
                    doc.id === newDoc.id
                        ? {
                            ...doc,
                            status: 'completed',
                            content: data.content,
                            editedContent: data.content
                        }
                        : doc
                ));

                toast({
                    title: "Document Generated",
                    description: "Your legal document has been generated successfully!",
                });

                // Reset form
                setDocType('');
                setDocTitle('');
                setDocDescription('');
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            setGeneratedDocs(prev => prev.map(doc =>
                doc.id === newDoc.id
                    ? { ...doc, status: 'error' }
                    : doc
            ));

            toast({
                title: "Generation Failed",
                description: "Failed to generate document. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadAsPDF = async (content: string, fileName: string, type: 'generated' | 'translated' = 'generated') => {
        try {
            const response = await fetch('/api/documents/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content,
                    fileName,
                    type
                }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast({
                    title: "Download Started",
                    description: "Your PDF is being downloaded.",
                });
            } else {
                throw new Error('PDF generation failed');
            }
        } catch (error) {
            toast({
                title: "Download Failed",
                description: "Failed to generate PDF. Please try again.",
                variant: "destructive",
            });
        }
    };

    const toggleEdit = (id: string) => {
        setGeneratedDocs(prev => prev.map(doc =>
            doc.id === id
                ? {
                    ...doc,
                    isEditing: !doc.isEditing,
                    editedContent: doc.isEditing ? doc.editedContent : doc.content
                }
                : doc
        ));
    };

    const updateDocContent = (id: string, newContent: string) => {
        setGeneratedDocs(prev => prev.map(doc =>
            doc.id === id
                ? { ...doc, editedContent: newContent }
                : doc
        ));
    };

    const saveDocContent = (id: string) => {
        setGeneratedDocs(prev => prev.map(doc =>
            doc.id === id
                ? {
                    ...doc,
                    content: doc.editedContent || doc.content,
                    isEditing: false
                }
                : doc
        ));

        toast({
            title: "Changes Saved",
            description: "Document content has been updated successfully.",
        });
    };

    const cancelEdit = (id: string) => {
        setGeneratedDocs(prev => prev.map(doc =>
            doc.id === id
                ? {
                    ...doc,
                    isEditing: false,
                    editedContent: doc.content
                }
                : doc
        ));
    };

    const deleteAnalyzedDoc = (id: string) => {
        setAnalyzedDocs(prev => prev.filter(doc => doc.id !== id));
        toast({
            title: "Document Deleted",
            description: "Document has been removed from your list",
        });
    };

    const deleteGeneratedDoc = (id: string) => {
        setGeneratedDocs(prev => prev.filter(doc => doc.id !== id));
        toast({
            title: "Document Deleted",
            description: "Generated document has been removed",
        });
    };

    const deleteTranslatedDoc = (id: string) => {
        setTranslatedDocs(prev => prev.filter(doc => doc.id !== id));
        toast({
            title: "Document Deleted",
            description: "Translated document has been removed",
        });
    };

    // Helper function to render formatted text
    const renderFormattedText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, index) => {
            // Handle bold text with **text** pattern
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            const formattedLine = parts.map((part, partIndex) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    return (
                        <strong key={partIndex} className="font-bold text-slate-900">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return <span key={partIndex}>{part}</span>;
            });

            return (
                <div key={index} className={line.trim() === '' ? 'mb-4' : 'mb-2'}>
                    {formattedLine}
                </div>
            );
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (showApiKeyInput) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
                <Navbar />
                <div className="pt-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md mx-auto py-16">
                        <Card>
                            <CardHeader className="text-center">
                                <CardTitle>AI Document Processor Setup</CardTitle>
                                <CardDescription>
                                    Enter your Gemini API key to use AI-powered document processing
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">Gemini API Key</Label>
                                    <Input
                                        id="apiKey"
                                        type="password"
                                        placeholder="Enter your Gemini API key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleApiKeySubmit} className="w-full">
                                    Save API Key
                                </Button>
                                <p className="text-xs text-slate-500 text-center">
                                    Get your free API key from Google AI Studio
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="pt-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto py-8">
                    <div className="mb-6 px-4 sm:px-6 md:px-0 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-snug">
                            AI Document Processor
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-2 leading-relaxed">
                            Analyze, generate, and translate legal documents with AI
                        </p>
                    </div>

                    {/* Section Tabs */}
                    <div className="mb-8 px-4 sm:px-0">
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-slate-100 p-1 rounded-lg w-full sm:w-fit overflow-x-auto justify-center">
                            <button
                                onClick={() => setActiveSection('analyze')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                    activeSection === 'analyze'
                                    ? 'bg-white text-slate-900 shadow'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                >
                                <Brain className="w-4 h-4" />
                                <span>Document Analysis</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('generate')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                    activeSection === 'generate'
                                    ? 'bg-white text-slate-900 shadow'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                >
                                <FileEdit className="w-4 h-4" />
                                <span>Document Generation</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('translate')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                    activeSection === 'translate'
                                    ? 'bg-white text-slate-900 shadow'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                >
                                <Languages className="w-4 h-4" />
                                <span>Document Translation</span>
                            </button>
                        </div>
                    </div>

                    {activeSection === 'analyze' && (
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Upload Documents for Analysis</CardTitle>
                                    <CardDescription>
                                        Upload PDF legal documents to get AI-powered analysis and insights.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        {/* Upload Drop Area */}
                                        <div
                                            {...getAnalyzeRootProps()}
                                            className="relative border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-8 text-center transition-colors cursor-pointer"
                                        >
                                            <input {...getAnalyzeInputProps()} />
                                            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                            <p className="text-lg font-medium text-slate-700 mb-2">
                                                {isAnalyzeDragActive
                                                    ? 'Drop your PDF files here'
                                                    : 'Drop your PDF documents here'}
                                            </p>
                                            <p className="text-slate-500 mb-4">
                                                or click to browse from your device
                                            </p>
                                            <Button disabled={isAnalyzing}>
                                                {isAnalyzing ? 'Analyzing...' : 'Choose PDF Files'}
                                            </Button>
                                            
                                            {isAnalyzing && (
                                            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center space-y-3">
                                                <div className="w-10 h-10 border-4 border-dotted border-sky-500 border-t-transparent rounded-full animate-spin" />
                                                <p className="text-slate-600 text-sm font-medium">
                                                Analyzing your document...
                                                </p>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                          
                            {/* Analyzed Documents */}  
                            <div ref={resultsRef} className="space-y-4">
                                {analyzedDocs.map((doc) => (
                                    <Card key={doc.id} className="overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex items-center space-x-4">
                                                    <div className="bg-slate-100 p-3 rounded-lg">
                                                        <FileText className="w-6 h-6 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900">{doc.name}</h3>
                                                        <p className="text-sm text-slate-500">
                                                            {doc.type} • {doc.size} • {doc.uploadDate.toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Badge
                                                        variant={
                                                            doc.status === 'completed' ? 'default' :
                                                                doc.status === 'processing' ? 'secondary' : 'destructive'
                                                        }
                                                    >
                                                        {doc.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                        {doc.status === 'processing' && <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />}
                                                        {doc.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteAnalyzedDoc(doc.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Analysis Results */}
                                            {doc.status === 'completed' && doc.analysis && (
                                                <div className="mt-6 pt-6 border-t border-slate-200">
                                                    <h4 className="font-semibold text-slate-900 mb-4">AI Analysis Results</h4>

                                                    {/* Summary */}
                                                    <div className="mb-6">
                                                        <h5 className="font-medium text-slate-700 mb-2">Document Summary</h5>
                                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                                            {doc.analysis.summary}
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div>
                                                            <h5 className="font-medium text-slate-700 mb-2">Key Points</h5>
                                                            <ul className="space-y-1 text-sm text-slate-600">
                                                                {doc.analysis.keyPoints.map((point, index) => (
                                                                    <li key={index} className="flex items-start">
                                                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                        {point}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-slate-700 mb-2">Legal Concerns</h5>
                                                            <ul className="space-y-1 text-sm text-slate-600">
                                                                {doc.analysis.legalConcerns.map((concern, index) => (
                                                                    <li key={index} className="flex items-start">
                                                                        <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                        {concern}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-slate-700 mb-2">Recommendations</h5>
                                                            <ul className="space-y-1 text-sm text-slate-600">
                                                                {doc.analysis.recommendations.map((rec, index) => (
                                                                    <li key={index} className="flex items-start">
                                                                        <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                        {rec}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {analyzedDocs.length === 0 && (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-slate-700 mb-2">No documents analyzed yet</h3>
                                        <p className="text-slate-500">Upload your first PDF document to get AI-powered analysis</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeSection === 'generate' && (
                        <div className="space-y-6">
                            {/* Document Generation Form */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Generate Legal Document</CardTitle>
                                    <CardDescription>
                                    Use AI to generate professional legal documents based on your requirements
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="relative space-y-4">
                                    {/* Overlay shown while generating */}
                                    {isGenerating && (
                                        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center space-y-3">
                                            <div className="w-10 h-10 border-4 border-dotted border-sky-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-slate-600 text-sm font-medium">Generating your document...</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="docType">Document Type</Label>
                                            <Select value={docType} onValueChange={setDocType}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select document type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {documentTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="docTitle">Document Title</Label>
                                            <Input
                                            id="docTitle"
                                            placeholder="Enter document title"
                                            value={docTitle}
                                            onChange={(e) => setDocTitle(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="docDescription">Description & Requirements</Label>
                                        <Textarea
                                            id="docDescription"
                                            placeholder="Describe the document requirements, parties involved, terms, conditions, etc."
                                            value={docDescription}
                                            onChange={(e) => setDocDescription(e.target.value)}
                                            rows={4}
                                        />
                                    </div>
                                    <Button
                                        onClick={generateDocument}
                                        disabled={isGenerating || !docType || !docTitle || !docDescription}
                                        className="w-full"
                                    >
                                        {isGenerating ? 'Generating Document...' : 'Generate Document'}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Generated Documents */}
                            <div ref={generatedSectionRef} className="space-y-4">
                                {generatedDocs.map((doc) => (
                                    <Card key={doc.id} className="overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between flex-wrap">
                                                <div className="flex items-center space-x-4">
                                                    <div className="bg-slate-100 p-3 rounded-lg">
                                                        <FileEdit className="w-6 h-6 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                                                        <p className="text-sm text-slate-500">
                                                            {documentTypes.find(t => t.value === doc.type)?.label} • {doc.createdDate.toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-1">{doc.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Badge
                                                        variant={
                                                            doc.status === 'completed' ? 'default' :
                                                                doc.status === 'generating' ? 'secondary' : 'destructive'
                                                        }
                                                    >
                                                        {doc.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                        {doc.status === 'generating' && <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />}
                                                        {doc.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                                    </Badge>
                                                    {doc.status === 'completed' && (
                                                        <>
                                                            {doc.isEditing ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => saveDocContent(doc.id)}
                                                                        className="text-green-600 hover:text-green-700"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => cancelEdit(doc.id)}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => toggleEdit(doc.id)}
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => downloadAsPDF(doc.content, doc.title, 'generated')}
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteGeneratedDoc(doc.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Generated Content */}
                                            {doc.status === 'completed' && doc.content && (
                                                <div className="mt-6 pt-6 border-t border-slate-200">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-slate-900">Generated Document</h4>
                                                    </div>

                                                    {doc.isEditing ? (
                                                        <Textarea
                                                            value={doc.editedContent || doc.content}
                                                            onChange={(e) => updateDocContent(doc.id, e.target.value)}
                                                            className="min-h-96 font-mono text-sm"
                                                            placeholder="Edit your document content here..."
                                                        />
                                                    ) : (
                                                        <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
                                                            <div className="text-sm text-slate-700">
                                                                {renderFormattedText(doc.content)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {generatedDocs.length === 0 && (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <FileEdit className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-slate-700 mb-2">No documents generated yet</h3>
                                        <p className="text-slate-500">Fill in the form above to generate your first AI legal document</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeSection === 'translate' && (
                        <div className="space-y-6">
                            {/* Translation Setup */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Document Translation</CardTitle>
                                    <CardDescription>
                                        Upload PDF documents in foreign languages to translate them into your preferred language
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Language selection */}
                                    <div className="space-y-2">
                                        <Label htmlFor="targetLanguage">Target Language</Label>
                                        <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select target language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {languages.map((lang) => (
                                                    <SelectItem key={lang.value} value={lang.value}>
                                                        {lang.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Upload Drop Area */}
                                    <div className="relative">
                                        <div
                                            {...getTranslateRootProps()}
                                            className={`relative border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-8 text-center transition-colors cursor-pointer`}
                                        >
                                            <input {...getTranslateInputProps()} />
                                            <Languages className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                            <p className="text-lg font-medium text-slate-700 mb-2">
                                                {isTranslateDragActive
                                                    ? 'Drop your PDF files here'
                                                    : 'Drop your PDF documents here for translation'}
                                            </p>
                                            <p className="text-slate-500 mb-4">
                                                {!targetLanguage
                                                    ? 'Select a target language first'
                                                    : 'or click to browse from your device'}
                                            </p>
                                            <Button disabled={isTranslating || !targetLanguage}>
                                                {isTranslating ? 'Translating...' : 'Choose PDF Files'}
                                            </Button>

                                            {/* Overlay Spinner (Inside dashed box only) */}
                                            {isTranslating && (
                                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center space-y-3">
                                                    <div className="w-10 h-10 border-4 border-dotted border-sky-500 border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-slate-600 text-sm font-medium">Translating your document...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Translated Documents */}
                            <div ref={translatedSectionRef} className="space-y-4">
                                {translatedDocs.map((doc) => (
                                    <Card key={doc.id} className="overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between flex-wrap">
                                                <div className="flex items-center space-x-4">
                                                    <div className="bg-slate-100 p-3 rounded-lg">
                                                        <Languages className="w-6 h-6 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900">{doc.name}</h3>
                                                        <p className="text-sm text-slate-500">
                                                            {doc.originalLanguage} → {languages.find(l => l.value === doc.targetLanguage)?.label} • {doc.uploadDate.toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Badge
                                                        variant={
                                                            doc.status === 'completed' ? 'default' :
                                                                doc.status === 'processing' ? 'secondary' : 'destructive'
                                                        }
                                                    >
                                                        {doc.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                        {doc.status === 'processing' && <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />}
                                                        {doc.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                                    </Badge>
                                                    {doc.status === 'completed' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => downloadAsPDF(doc.translatedContent, `${doc.name}_translated`, 'translated')}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteTranslatedDoc(doc.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Translated Content */}
                                            {doc.status === 'completed' && doc.translatedContent && (
                                                <div className="mt-6 pt-6 border-t border-slate-200">
                                                    <h4 className="font-semibold text-slate-900 mb-4">Translated Document</h4>
                                                    <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
                                                        <div className="text-sm text-slate-700">
                                                            {renderFormattedText(doc.translatedContent)}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {translatedDocs.length === 0 && (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <Languages className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-slate-700 mb-2">No documents translated yet</h3>
                                        <p className="text-slate-500">Select a target language and upload your first PDF document for translation</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentProcessor;