"use client"
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // TODO: Implement search functionality
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 flex items-center justify-center overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-sky-300/20 rounded-full blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 bg-white/70 backdrop-blur-sm border border-sky-200 rounded-full px-4 py-2 text-sm text-slate-600 mb-8">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>Powered by Advanced AI Technology</span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
          <span className="block">Empowering Legal Access</span>
          <span className="block bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
            with AI in India
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          Your intelligent legal companion for case research, document analysis,
          and connecting with expert advocates across India.
        </p>

        {/* Search Bar */}

        {/* <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Laws, Judgments, Lawyers..."
              className="w-full pl-12 pr-32 py-4 text-lg border border-slate-300 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-200"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 mr-2 my-2 px-6 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
            >
              <span>Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form> */}

        {/* Quick suggestions */}

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['IPC Section 420', 'Property Law', 'Family Court', 'Corporate Law'].map((suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full text-slate-600 hover:text-sky-600 hover:border-sky-300 transition-all duration-200 hover:scale-105"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { number: '10,000+', label: 'Legal Documents' },
            { number: '500+', label: 'Expert Lawyers' },
            { number: '50,000+', label: 'Cases Resolved' },
            { number: '24/7', label: 'AI Support' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{stat.number}</div>
              <div className="text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
