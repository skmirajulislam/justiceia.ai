'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Filter, Download, Eye } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface LegalDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  court: string;
  tags: string[];
}

const LegalLibrary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const documents: LegalDocument[] = [
    {
      id: '1',
      title: 'Kesavananda Bharati v. State of Kerala',
      category: 'Constitutional Law',
      description: 'Landmark case establishing the basic structure doctrine of the Indian Constitution.',
      date: '1973-04-24',
      court: 'Supreme Court of India',
      tags: ['Constitutional Law', 'Basic Structure', 'Fundamental Rights']
    },
    {
      id: '2',
      title: 'Vishaka v. State of Rajasthan',
      category: 'Criminal Law',
      description: 'Guidelines for prevention of sexual harassment at workplace.',
      date: '1997-08-13',
      court: 'Supreme Court of India',
      tags: ['Sexual Harassment', 'Workplace', 'Women Rights']
    },
    {
      id: '3',
      title: 'Maneka Gandhi v. Union of India',
      category: 'Constitutional Law',
      description: 'Expanded interpretation of Article 21 - Right to Life and Personal Liberty.',
      date: '1978-01-25',
      court: 'Supreme Court of India',
      tags: ['Article 21', 'Personal Liberty', 'Due Process']
    },
    {
      id: '4',
      title: 'Indian Contract Act, 1872',
      category: 'Contract Law',
      description: 'Complete text of the Indian Contract Act with amendments.',
      date: '1872-04-25',
      court: 'Legislative',
      tags: ['Contract Law', 'Commercial Law', 'Legal Framework']
    }
  ];

  const categories = ['all', 'Constitutional Law', 'Criminal Law', 'Contract Law', 'Civil Law', 'Corporate Law'];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
            <p className="text-slate-600">Comprehensive collection of legal documents, case laws, and statutes</p>
          </div>

          {/* Search and Filter Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search legal documents, case laws, statutes..."
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
                    className="px-3 py-2 border border-slate-200 rounded-md bg-white"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">{doc.category}</Badge>
                    <span className="text-sm text-slate-500">{new Date(doc.date).getFullYear()}</span>
                  </div>
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    {doc.court}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 mb-4">{doc.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {doc.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No documents found matching your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalLibrary;
