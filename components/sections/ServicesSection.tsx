"use client"
import Link from 'next/link';
import { MessageSquare, Shield, BookOpen, Video, ArrowRight, Sparkles } from 'lucide-react';

const ServicesSection = () => {
  const services = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'AI Legal Chatbot',
      description: 'Get instant answers to your legal questions with our advanced AI assistant trained on Indian law.',
      features: ['24/7 Availability', 'Multi-language Support', 'Case Law References'],
      gradient: 'from-blue-500 to-blue-600',
      href: '/chatbot'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'V-KYC Portal',
      description: 'Secure video-based Know Your Customer verification for lawyers and clients with digital document validation.',
      features: ['Video Verification', 'Document Upload', 'Real-time Validation'],
      gradient: 'from-green-500 to-green-600',
      href: '/profile'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Legal Library',
      description: 'Comprehensive database of Indian Constitution, IPC, CrPC, and landmark judgments with AI-powered search.',
      features: ['50,000+ Documents', 'Smart Search', 'AI Summaries'],
      gradient: 'from-purple-500 to-purple-600',
      href: '/library'
    },
    {
      icon: <Video className="w-8 h-8" />,
      title: 'Video Consultation',
      description: 'Connect with verified advocates for secure video consultations with integrated scheduling and payments.',
      features: ['Verified Lawyers', 'Secure Calls', 'Easy Scheduling'],
      gradient: 'from-orange-500 to-orange-600',
      href: '/consult'
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-sky-50 border border-sky-200 rounded-full px-4 py-2 text-sm text-sky-600 mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Comprehensive Legal Solutions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Everything You Need for Legal Success
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            From AI-powered research to secure consultations, our platform provides all the tools
            you need to navigate India's legal landscape efficiently.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative bg-white border border-slate-200 rounded-2xl p-8 hover:border-sky-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Icon */}
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${service.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {service.icon}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{service.title}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">{service.description}</p>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center text-slate-600">
                    <div className="w-2 h-2 bg-sky-400 rounded-full mr-3"></div>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={service.href}
                className="inline-flex items-center space-x-2 text-sky-600 font-semibold hover:text-sky-700 group-hover:translate-x-1 transition-all duration-200"
              >
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>
        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Start Your Legal Journey Today
          </Link>
        </div>
        </div>
    </section>
  );
};

export default ServicesSection;
