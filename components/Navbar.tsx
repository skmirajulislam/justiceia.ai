'use client';
import React from 'react';
import { useState } from 'react';
import { Search, Menu, X, Scale, FileText, Video, Brain, Camera, LogIn } from 'lucide-react';
import Link from 'next/link';

const Navbar = () => {
  // State to manage mobile menu visibility
  // This will toggle the mobile menu when the hamburger icon is clicked
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [
    { name: 'AI Chatbot', href: '/chatbot', icon: <Search className="w-4 h-4" /> },
    { name: 'V-KYC', href: '/vkyc', icon: <Camera className="w-4 h-4" /> },
    { name: 'Legal Library', href: '/library', icon: <FileText className="w-4 h-4" /> },
    { name: 'Video Consult', href: '/consult', icon: <Video className="w-4 h-4" /> },
    { name: 'Document Processor', href: '/document-processor', icon: <Brain className="w-4 h-4" /> },
  ];

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-2 rounded-lg">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Advocate.ai</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 text-slate-600 hover:text-sky-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/auth"
              className="flex items-center space-x-1 text-slate-600 hover:text-sky-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/vkyc"
              className="bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-sky-500 hover:bg-slate-100 transition-colors duration-200"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className=" items-center space-x-2 text-slate-600 hover:text-sky-500 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
            <div className="pt-4 pb-2 border-t border-slate-200 mt-4">
              <Link
                href="/auth"
                className="items-center space-x-2 w-full text-left text-slate-600 hover:text-sky-500 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/vkyc"
                className="w-full mt-2 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 text-center block"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
