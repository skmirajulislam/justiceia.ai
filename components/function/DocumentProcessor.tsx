"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Download, Trash2, FileEdit, Brain, Languages, Edit3, Save, X, Volume2, VolumeX, Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';
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
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // Document Generation Form
    const [docType, setDocType] = useState('');
    const [docTitle, setDocTitle] = useState('');
    const [docDescription, setDocDescription] = useState('');
    const resultsRef = useRef<HTMLDivElement>(null);

    // Translation Form
    const [targetLanguage, setTargetLanguage] = useState('');
    const generatedSectionRef = useRef<HTMLDivElement>(null);
    const translatedSectionRef = useRef<HTMLDivElement>(null);

    // Document Speech Reader State
    const [readerState, setReaderState] = useState<{
        docId: string | null;
        isPlaying: boolean;
        isPaused: boolean;
        currentLineIndex: number;
        totalLines: number;
        lines: string[];
        language: string;
        rate: number;
    }>({
        docId: null,
        isPlaying: false,
        isPaused: false,
        currentLineIndex: 0,
        totalLines: 0,
        lines: [],
        language: 'english',
        rate: 0.95,
    });

    const readerStateRef = useRef(readerState);
    readerStateRef.current = readerState;

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

    // Language speech synthesis BCP-47 tag mapping
    const languageSpeechMap: Record<string, string> = {
        english: 'en-IN',
        bengali: 'bn-IN',
        hindi: 'hi-IN',
        telugu: 'te-IN',
        tamil: 'ta-IN',
        spanish: 'es-ES',
        chinese: 'zh-CN',
        french: 'fr-FR',
        german: 'de-DE'
    };

    // Clean spoken lines for audio narration
    const extractSpokenLines = (rawText: string): string[] => {
        return rawText
            .split('\n')
            .map(l => l.replace(/^[#*\->•\s]+/, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim())
            .filter(l => l.length > 0 && !/^(\*{3,}|-{3,}|_{3,})$/.test(l));
    };

    const speakCurrentLine = (lineIdx: number, lines: string[], lang: string, rate: number, docId: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            toast({
                title: "Speech Not Supported",
                description: "Your browser does not support speech synthesis audio playback.",
                variant: "destructive"
            });
            return;
        }

        if (lineIdx >= lines.length) {
            window.speechSynthesis.cancel();
            setReaderState(prev => ({
                ...prev,
                isPlaying: false,
                isPaused: false,
                currentLineIndex: 0
            }));
            toast({
                title: "Document Reading Complete",
                description: `Finished reading the document in ${languages.find(l => l.value === lang)?.label || lang}.`,
            });
            return;
        }

        window.speechSynthesis.cancel();

        const lineText = lines[lineIdx];
        const utterance = new SpeechSynthesisUtterance(lineText);
        const langCode = languageSpeechMap[lang.toLowerCase()] || 'en-IN';
        utterance.lang = langCode;
        utterance.rate = rate;

        // Search for best matching regional voice
        const voices = window.speechSynthesis.getVoices();
        const exactVoice = voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
        const langPrefix = langCode.split('-')[0].toLowerCase();
        const fallbackVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));

        if (exactVoice) {
            utterance.voice = exactVoice;
        } else if (fallbackVoice) {
            utterance.voice = fallbackVoice;
        }

        utterance.onend = () => {
            if (
                readerStateRef.current.docId === docId &&
                readerStateRef.current.isPlaying &&
                !readerStateRef.current.isPaused
            ) {
                const nextIdx = lineIdx + 1;
                setReaderState(prev => ({ ...prev, currentLineIndex: nextIdx }));
                speakCurrentLine(nextIdx, lines, lang, rate, docId);
            }
        };

        utterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.warn('Speech error:', e);
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    const startReading = (docId: string, text: string, lang: string) => {
        const lines = extractSpokenLines(text);
        if (lines.length === 0) {
            toast({
                title: "No Content",
                description: "No readable text found for audio playback.",
                variant: "destructive"
            });
            return;
        }

        const currentRate = readerState.rate || 0.95;
        setReaderState({
            docId,
            isPlaying: true,
            isPaused: false,
            currentLineIndex: 0,
            totalLines: lines.length,
            lines,
            language: lang,
            rate: currentRate
        });

        speakCurrentLine(0, lines, lang, currentRate, docId);
    };

    const pauseReading = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.pause();
            setReaderState(prev => ({ ...prev, isPaused: true }));
        }
    };

    const resumeReading = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setReaderState(prev => ({ ...prev, isPaused: false }));
            } else {
                setReaderState(prev => ({ ...prev, isPaused: false }));
                speakCurrentLine(
                    readerState.currentLineIndex,
                    readerState.lines,
                    readerState.language,
                    readerState.rate,
                    readerState.docId || ''
                );
            }
        }
    };

    const stopReading = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setReaderState(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            docId: null,
            currentLineIndex: 0
        }));
    };

    const skipLine = (delta: number) => {
        const nextIdx = Math.max(0, Math.min(readerState.lines.length - 1, readerState.currentLineIndex + delta));
        setReaderState(prev => ({ ...prev, currentLineIndex: nextIdx, isPaused: false }));
        speakCurrentLine(
            nextIdx,
            readerState.lines,
            readerState.language,
            readerState.rate,
            readerState.docId || ''
        );
    };

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            if (loading) return;

            if (!session) {
                router.push('/auth');
                return;
            }

            // Session is validated; server environment provides default Gemini key
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

        // Store custom key in in-memory component state
        setShowApiKeyInput(false);

        toast({
            title: "API Key Configured",
            description: "Custom Gemini API key active for this session.",
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
                    apiKey: apiKey || undefined
                }),
            });

            const data = await response.json();

            if (response.ok) {
                return data.analysis;
            } else {
                if (data.requiresApiKey) {
                    setShowApiKeyInput(true);
                }
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error: any) {
            console.error('Analysis error:', error);
            return null;
        }
    };

    // Analysis Dropzone
    const onDropAnalyze = useCallback(async (acceptedFiles: File[]) => {
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
                        apiKey: apiKey || undefined
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
                    if (data.requiresApiKey) {
                        setShowApiKeyInput(true);
                    }
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
                    apiKey: apiKey || undefined
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
                if (data.requiresApiKey) {
                    setShowApiKeyInput(true);
                }
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

    // Helper function to render formatted legal document markdown with high-fidelity legal styling and audio highlighting
    const renderFormattedText = (text: string, docId?: string) => {
        if (!text) return null;

        const lines = text.split('\n');
        const renderedElements: React.ReactNode[] = [];
        let spokenLineCounter = 0;

        // Helper to format inline bold, italics
        const renderInlineStyles = (inlineText: string, keyPrefix: string) => {
            const parts = inlineText.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
            return parts.map((part, partIdx) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                    return (
                        <strong key={`${keyPrefix}-b-${partIdx}`} className="font-bold text-slate-900 dark:text-white">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
                    (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
                    return (
                        <em key={`${keyPrefix}-i-${partIdx}`} className="italic text-slate-700 dark:text-slate-300">
                            {part.slice(1, -1)}
                        </em>
                    );
                }
                return <span key={`${keyPrefix}-t-${partIdx}`}>{part}</span>;
            });
        };

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const trimmed = rawLine.trim();

            if (!trimmed) {
                renderedElements.push(<div key={`space-${i}`} className="h-2" />);
                continue;
            }

            // Divider: ---, ***, ___
            if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
                renderedElements.push(
                    <hr key={`div-${i}`} className="my-4 border-slate-200 dark:border-slate-700" />
                );
                continue;
            }

            const isCurrentlyBeingRead =
                readerState.docId === docId &&
                readerState.isPlaying &&
                readerState.currentLineIndex === spokenLineCounter;

            const highlightClass = isCurrentlyBeingRead
                ? "bg-sky-100/90 dark:bg-sky-950/80 border-l-4 border-sky-500 rounded-r-lg px-3 py-1.5 transition-all duration-300 ring-2 ring-sky-400/40 shadow-sm"
                : "";

            spokenLineCounter++;

            // Heading 1: # Title
            if (/^#\s+/.test(trimmed)) {
                const heading = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                renderedElements.push(
                    <div key={`h1-${i}`} className={highlightClass}>
                        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900 dark:text-white my-2 text-center sm:text-left border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                            {isCurrentlyBeingRead && <Volume2 className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />}
                            <span>{heading}</span>
                        </h2>
                    </div>
                );
                continue;
            }

            // Heading 2: ## Section
            if (/^##\s+/.test(trimmed)) {
                const heading = trimmed.replace(/^##+\s*/, '').replace(/\*\*/g, '');
                renderedElements.push(
                    <div key={`h2-${i}`} className={highlightClass}>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-3 mb-1.5 flex items-center gap-2">
                            {isCurrentlyBeingRead && <Volume2 className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />}
                            <span>{heading}</span>
                        </h3>
                    </div>
                );
                continue;
            }

            // Heading 3: ### Sub-section
            if (/^###+\s+/.test(trimmed)) {
                const heading = trimmed.replace(/^###+\s*/, '').replace(/\*\*/g, '');
                renderedElements.push(
                    <div key={`h3-${i}`} className={highlightClass}>
                        <h4 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1 flex items-center gap-2">
                            {isCurrentlyBeingRead && <Volume2 className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />}
                            <span>{heading}</span>
                        </h4>
                    </div>
                );
                continue;
            }

            // Disclaimer / Notice block
            if (/^(>|DISCLAIMER:|\*This legal document)/i.test(trimmed)) {
                const cleanDisclaimer = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '');
                renderedElements.push(
                    <div key={`disc-${i}`} className={`p-3.5 my-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg text-xs sm:text-sm text-amber-900 dark:text-amber-200 ${highlightClass}`}>
                        {isCurrentlyBeingRead && <Volume2 className="w-4 h-4 text-amber-600 animate-pulse inline mr-1.5" />}
                        {renderInlineStyles(cleanDisclaimer, `disc-${i}`)}
                    </div>
                );
                continue;
            }

            // Numbered / Clause list (e.g. 1. Item, (a) Item)
            const numMatch = trimmed.match(/^(\d+\.|\([a-zA-Z0-9]+\))\s+(.*)/);
            if (numMatch) {
                renderedElements.push(
                    <div key={`num-${i}`} className={`flex items-start gap-2.5 my-1.5 pl-2 ${highlightClass}`}>
                        {isCurrentlyBeingRead ? (
                            <Volume2 className="w-4 h-4 text-sky-600 animate-pulse shrink-0 mt-0.5" />
                        ) : (
                            <span className="font-bold text-sky-600 dark:text-sky-400 font-mono text-sm shrink-0">
                                {numMatch[1]}
                            </span>
                        )}
                        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                            {renderInlineStyles(numMatch[2], `num-body-${i}`)}
                        </div>
                    </div>
                );
                continue;
            }

            // Bullet list item
            const bulletMatch = trimmed.match(/^([*\-•])\s+(.*)/);
            if (bulletMatch && !trimmed.startsWith('***')) {
                renderedElements.push(
                    <div key={`bullet-${i}`} className={`flex items-start gap-2.5 my-1.5 pl-3 ${highlightClass}`}>
                        {isCurrentlyBeingRead ? (
                            <Volume2 className="w-4 h-4 text-sky-600 animate-pulse shrink-0 mt-0.5" />
                        ) : (
                            <span className="text-sky-500 shrink-0 font-bold text-sm">•</span>
                        )}
                        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                            {renderInlineStyles(bulletMatch[2], `bullet-body-${i}`)}
                        </div>
                    </div>
                );
                continue;
            }

            // Standard Paragraph / Clause line
            renderedElements.push(
                <div key={`p-${i}`} className={highlightClass}>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed my-1 flex items-start gap-2">
                        {isCurrentlyBeingRead && <Volume2 className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0 mt-1" />}
                        <span>{renderInlineStyles(trimmed, `p-${i}`)}</span>
                    </p>
                </div>
            );
        }

        return <div className="space-y-1 font-sans">{renderedElements}</div>;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (showApiKeyInput) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
                <Navbar />
                <div className="pt-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md mx-auto py-16">
                        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <CardHeader className="text-center">
                                <CardTitle className="text-slate-900 dark:text-white">AI Document Processor Setup</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400">
                                    Enter your Gemini API key to use AI-powered document processing
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey" className="text-slate-700 dark:text-slate-300">Gemini API Key</Label>
                                    <Input
                                        id="apiKey"
                                        type="password"
                                        placeholder="Enter your Gemini API key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <Button onClick={handleApiKeySubmit} className="w-full bg-sky-600 hover:bg-sky-700">
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
            <Navbar />
            <div className="pt-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto py-8">
                    <div className="mb-6 px-4 sm:px-6 md:px-0 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-snug">
                            AI Document Processor
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                            Analyze, generate, and translate legal documents with AI
                        </p>
                    </div>

                    {/* Section Tabs */}
                    <div className="mb-8 px-4 sm:px-0">
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-fit overflow-x-auto justify-center border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setActiveSection('analyze')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                    activeSection === 'analyze'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                >
                                <Brain className="w-4 h-4 text-sky-500" />
                                <span>Document Analysis</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('generate')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                    activeSection === 'generate'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                >
                                <FileEdit className="w-4 h-4 text-emerald-500" />
                                <span>Document Generation</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('translate')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                    activeSection === 'translate'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                >
                                <Languages className="w-4 h-4 text-purple-500" />
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
                                                                variant={readerState.docId === doc.id && readerState.isPlaying ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (readerState.docId === doc.id && readerState.isPlaying) {
                                                                        stopReading();
                                                                    } else {
                                                                        startReading(doc.id, doc.content, 'english');
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-1.5 text-xs font-semibold ${
                                                                    readerState.docId === doc.id && readerState.isPlaying
                                                                        ? 'bg-sky-600 text-white'
                                                                        : 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950'
                                                                }`}
                                                                title="Listen to line-by-line narration"
                                                            >
                                                                {readerState.docId === doc.id && readerState.isPlaying ? (
                                                                    <>
                                                                        <VolumeX className="w-3.5 h-3.5" /> Stop Reader
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Volume2 className="w-3.5 h-3.5" /> Document Reader
                                                                    </>
                                                                )}
                                                            </Button>
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

                                                    {/* Document Reader Control Bar */}
                                                    {readerState.docId === doc.id && readerState.isPlaying && (
                                                        <div className="mb-4 p-3.5 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 border border-sky-300 dark:border-sky-800 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md animate-pulse">
                                                                    <Volume2 className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                        <span>AI Legal Document Reader</span>
                                                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                                        Narrating line {readerState.currentLineIndex + 1} of {readerState.totalLines}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => skipLine(-1)}
                                                                    disabled={readerState.currentLineIndex === 0}
                                                                    className="h-8 px-2 text-xs"
                                                                    title="Previous Line"
                                                                >
                                                                    <SkipBack className="w-3.5 h-3.5" />
                                                                </Button>

                                                                {readerState.isPaused ? (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={resumeReading}
                                                                        className="h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-1"
                                                                    >
                                                                        <Play className="w-3.5 h-3.5" /> Resume
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={pauseReading}
                                                                        className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1"
                                                                    >
                                                                        <Pause className="w-3.5 h-3.5" /> Pause
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => skipLine(1)}
                                                                    disabled={readerState.currentLineIndex >= readerState.totalLines - 1}
                                                                    className="h-8 px-2 text-xs"
                                                                    title="Next Line"
                                                                >
                                                                    <SkipForward className="w-3.5 h-3.5" />
                                                                </Button>

                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={stopReading}
                                                                    className="h-8 px-2.5 text-xs flex items-center gap-1"
                                                                >
                                                                    <Square className="w-3 h-3 fill-current" /> Stop
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {doc.isEditing ? (
                                                        <Textarea
                                                            value={doc.editedContent || doc.content}
                                                            onChange={(e) => updateDocContent(doc.id, e.target.value)}
                                                            className="min-h-96 font-mono text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                            placeholder="Edit your document content here..."
                                                        />
                                                    ) : (
                                                        <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-h-[32rem] overflow-y-auto shadow-inner">
                                                            <div className="text-sm">
                                                                {renderFormattedText(doc.content, doc.id)}
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
                                                        <>
                                                            <Button
                                                                variant={readerState.docId === doc.id && readerState.isPlaying ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (readerState.docId === doc.id && readerState.isPlaying) {
                                                                        stopReading();
                                                                    } else {
                                                                        startReading(doc.id, doc.translatedContent, doc.targetLanguage);
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-1.5 text-xs font-semibold ${
                                                                    readerState.docId === doc.id && readerState.isPlaying
                                                                        ? 'bg-sky-600 text-white'
                                                                        : 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950'
                                                                }`}
                                                                title="Listen to line-by-line explanation in translated language"
                                                            >
                                                                {readerState.docId === doc.id && readerState.isPlaying ? (
                                                                    <>
                                                                        <VolumeX className="w-3.5 h-3.5" /> Stop Reader
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Volume2 className="w-3.5 h-3.5" /> Document Reader ({languages.find(l => l.value === doc.targetLanguage)?.label || 'Local Language'})
                                                                    </>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => downloadAsPDF(doc.translatedContent, `${doc.name}_translated`, 'translated')}
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        </>
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
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">
                                                            Translated Document ({languages.find(l => l.value === doc.targetLanguage)?.label || 'Local Language'})
                                                        </h4>
                                                    </div>

                                                    {/* Document Reader Control Bar */}
                                                    {readerState.docId === doc.id && readerState.isPlaying && (
                                                        <div className="mb-4 p-3.5 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 border border-sky-300 dark:border-sky-800 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md animate-pulse">
                                                                    <Volume2 className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                        <span>AI Legal Document Reader ({languages.find(l => l.value === doc.targetLanguage)?.label || 'Translated'})</span>
                                                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                                        Narrating line {readerState.currentLineIndex + 1} of {readerState.totalLines}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => skipLine(-1)}
                                                                    disabled={readerState.currentLineIndex === 0}
                                                                    className="h-8 px-2 text-xs"
                                                                    title="Previous Line"
                                                                >
                                                                    <SkipBack className="w-3.5 h-3.5" />
                                                                </Button>

                                                                {readerState.isPaused ? (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={resumeReading}
                                                                        className="h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-1"
                                                                    >
                                                                        <Play className="w-3.5 h-3.5" /> Resume
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={pauseReading}
                                                                        className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1"
                                                                    >
                                                                        <Pause className="w-3.5 h-3.5" /> Pause
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => skipLine(1)}
                                                                    disabled={readerState.currentLineIndex >= readerState.totalLines - 1}
                                                                    className="h-8 px-2 text-xs"
                                                                    title="Next Line"
                                                                >
                                                                    <SkipForward className="w-3.5 h-3.5" />
                                                                </Button>

                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={stopReading}
                                                                    className="h-8 px-2.5 text-xs flex items-center gap-1"
                                                                >
                                                                    <Square className="w-3 h-3 fill-current" /> Stop
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-h-[32rem] overflow-y-auto shadow-inner">
                                                        <div className="text-sm">
                                                            {renderFormattedText(doc.translatedContent, doc.id)}
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