"use client"
import { Sparkles } from 'lucide-react';

const HeroSection = () => {

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
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 font-[Times_New_Roman]">
          <span className="block">Seamless Legal Support for India</span>
          <span className="block bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
            Powered by AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">

          Your intelligent legal companion for document drafting, real-time translation, case research, and secure access to verified advocates across India.
        </p>

        {/* Quick suggestions */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['IPC Section 420', 'Property Law', 'Family Court', 'Corporate Law'].map((suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full text-slate-600"
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
