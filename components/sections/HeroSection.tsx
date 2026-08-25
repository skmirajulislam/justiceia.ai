"use client"
import { Sparkles } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center overflow-hidden transition-colors duration-200">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/30 dark:bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-sky-300/20 dark:bg-sky-400/10 rounded-full blur-2xl"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-sky-200 dark:border-sky-800/60 rounded-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 mb-8 shadow-sm">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>Powered by Advanced AI Technology</span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 font-[Times_New_Roman] tracking-tight">
          <span className="block">Seamless Legal Support for India</span>
          <span className="block bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
            Powered by AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
          Your intelligent legal companion for document drafting, real-time translation, case research, and secure access to verified advocates across India.
        </p>

        {/* Quick suggestions */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['IPC Section 420', 'Property Law', 'Family Court', 'Corporate Law'].map((suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
          {[
            { number: '10,000+', label: 'Legal Documents' },
            { number: '500+', label: 'Expert Lawyers' },
            { number: '50,000+', label: 'Cases Resolved' },
            { number: '24/7', label: 'AI Support' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.number}</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
