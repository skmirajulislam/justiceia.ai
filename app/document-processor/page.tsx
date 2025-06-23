'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Brain, Download, Eye, Trash2, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface ProcessedDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: Date;
  status: 'processing' | 'completed' | 'error';
  analysis?: {
    documentType: string;
    keyPoints: string[];
    legalConcerns: string[];
    recommendations: string[];
  };
}

const DocumentProcessor = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([
    {
      id: '1',
      name: 'Employment_Contract.pdf',
      type: 'PDF',
      size: '2.5 MB',
      uploadDate: new Date('2024-01-15'),
      status: 'completed',
      analysis: {
        documentType: 'Employment Contract',
        keyPoints: [
          'Fixed-term contract for 2 years',
          'Salary: ₹8,00,000 per annum',
          'Notice period: 30 days',
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
                keyPoints: ['Key terms identified', 'Parties involved confirmed'],
                legalConcerns: ['Standard review recommended'],
                recommendations: ['Consider legal consultation']
              }
            }
            : doc
        ));
      }, 3000);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 my-16">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Brain className="w-8 h-8 text-sky-500" />
              <h1 className="text-3xl font-bold text-slate-900">Legal Document Processor</h1>
            </div>
            <p className="text-slate-600">AI-powered analysis of legal documents for insights and recommendations</p>
          </div>

          {/* Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload legal documents for AI-powered analysis. Supported formats: PDF, DOC, DOCX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-slate-300 hover:border-sky-400'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Drop files here or click to upload</h3>
                <p className="text-slate-600 mb-4">Maximum file size: 10MB</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileInput}
                  className="hidden"
                  id="fileInput"
                />
                <label htmlFor="fileInput">
                  <Button asChild variant="outline">
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" />
                      Choose Files
                    </span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <div className="space-y-6">
            {documents.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-sky-500" />
                      <div>
                        <CardTitle className="text-lg">{doc.name}</CardTitle>
                        <CardDescription>
                          {doc.type} • {doc.size} • Uploaded {doc.uploadDate.toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          doc.status === 'completed' ? 'default' :
                            doc.status === 'processing' ? 'secondary' : 'destructive'
                        }
                      >
                        {doc.status === 'completed' && 'Analysis Complete'}
                        {doc.status === 'processing' && 'Processing...'}
                        {doc.status === 'error' && 'Error'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {doc.status === 'processing' && (
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
                      <span className="text-sm text-slate-600">AI is analyzing your document...</span>
                    </div>
                  </CardContent>
                )}

                {doc.status === 'completed' && doc.analysis && (
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Key Points */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Key Points</h4>
                        <ul className="space-y-2">
                          {doc.analysis.keyPoints.map((point, index) => (
                            <li key={index} className="text-sm text-slate-700 flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Legal Concerns */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span>Legal Concerns</span>
                        </h4>
                        <ul className="space-y-2">
                          {doc.analysis.legalConcerns.map((concern, index) => (
                            <li key={index} className="text-sm text-amber-700 flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span>{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendations */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Recommendations</h4>
                        <ul className="space-y-2">
                          {doc.analysis.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-green-700 flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Document
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Analysis
                      </Button>
                      <Button size="sm">
                        <Brain className="w-4 h-4 mr-2" />
                        Get Legal Advice
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {documents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No documents uploaded yet</h3>
              <p className="text-slate-600">Upload your first legal document to get started with AI analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessor;
