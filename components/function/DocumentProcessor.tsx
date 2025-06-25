"use client"
import { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';

interface DocumentAnalysis {
    documentType: string;
    keyPoints: string[];
    legalConcerns: string[];
    recommendations: string[];
}

interface ProcessedDocument {
    id: string;
    name: string;
    type: string;
    size: string;
    uploadDate: Date;
    status: 'processing' | 'completed' | 'error';
    analysis?: DocumentAnalysis;
}

const DocumentProcessor = () => {
    const { toast } = useToast();
    const [documents, setDocuments] = useState<ProcessedDocument[]>([
        {
            id: '1',
            name: 'Employment_Contract.pdf',
            type: 'PDF',
            size: '2.3 MB',
            uploadDate: new Date('2024-01-15'),
            status: 'completed',
            analysis: {
                documentType: 'Employment Contract',
                keyPoints: [
                    'Employment term: 2 years with 6-month probation',
                    'Salary: $75,000 annually with quarterly reviews',
                    'Benefits include health insurance and 401k',
                    'Remote work allowed 2 days per week',
                    'Non-compete clause included'
                ],
                legalConcerns: [
                    'Non-compete clause may be too restrictive',
                    'Termination conditions need clarification'
                ],
                recommendations: [
                    'Review non-compete clause with legal counsel',
                    'Clarify intellectual property ownership terms',
                    'Consider negotiating notice period'
                ]
            }
        },
        {
            id: '2',
            name: 'Property_Agreement.docx',
            type: 'DOCX',
            size: '1.8 MB',
            uploadDate: new Date('2024-01-14'),
            status: 'processing'
        }
    ]);

    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFiles = (files: FileList) => {
        Array.from(files).forEach((file) => {
            const newDoc: ProcessedDocument = {
                id: Date.now().toString(),
                name: file.name,
                type: file.type.split('/')[1].toUpperCase(),
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                uploadDate: new Date(),
                status: 'processing'
            };

            setDocuments(prev => [newDoc, ...prev]);

            // Simulate processing
            setTimeout(() => {
                setDocuments(prev => prev.map(doc =>
                    doc.id === newDoc.id
                        ? {
                            ...doc,
                            status: 'completed',
                            analysis: {
                                documentType: 'Contract Document',
                                keyPoints: [
                                    'Key terms identified',
                                    'Parties involved confirmed'
                                ],
                                legalConcerns: [
                                    'Standard review recommended'
                                ],
                                recommendations: [
                                    'Professional legal review advised'
                                ]
                            }
                        }
                        : doc
                ));
                toast({
                    title: "Processing Complete",
                    description: `${file.name} has been analyzed successfully`,
                });
            }, 3000);
        });
    };

    const deleteDocument = (id: string) => {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        toast({
            title: "Document Deleted",
            description: "Document has been removed from your list",
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="pt-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900">AI Document Processor</h1>
                        <p className="text-slate-600 mt-2">Upload legal documents for AI-powered analysis and insights</p>
                    </div>

                    {/* Upload Area */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Upload Documents</CardTitle>
                            <CardDescription>
                                Drag and drop your legal documents or click to browse. Supports PDF, DOCX, and TXT files.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                        ? 'border-sky-400 bg-sky-50'
                                        : 'border-slate-300 hover:border-slate-400'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-slate-700 mb-2">
                                    Drop your documents here
                                </p>
                                <p className="text-slate-500 mb-4">
                                    or click to browse from your device
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.txt"
                                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload">
                                    <Button className="cursor-pointer">
                                        Choose Files
                                    </Button>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents List */}
                    <div className="space-y-4">
                        {documents.map((doc) => (
                            <Card key={doc.id} className="overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
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
                                            <Button variant="ghost" size="sm">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteDocument(doc.id)}
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

                    {documents.length === 0 && (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-700 mb-2">No documents uploaded</h3>
                                <p className="text-slate-500">Upload your first document to get started with AI analysis</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentProcessor;