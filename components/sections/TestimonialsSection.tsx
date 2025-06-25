"use client"
import React from 'react';
import { Star, Quote } from 'lucide-react';
import Image from 'next/image';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Advocate Sk sahil',
      role: 'Senior Partner, Delhi High Court',
      image: 'https://rbo6om9l82.ufs.sh/f/or07poavtUuSHZyIfA6cYuFzfnxOvmJDpeILslVNEPk4Bhyi',
      content: 'Advocate.ai has revolutionized how I research case laws. The AI chatbot provides accurate references and saves me hours of manual research.',
      rating: 5
    },
    {
      name: 'Rajesh Kumar',
      role: 'Business Owner, Mumbai',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      content: 'The V-KYC process was seamless and the video consultation feature helped me resolve my property dispute efficiently.',
      rating: 5
    },
    {
      name: 'Dr. Sunita Reddy',
      role: 'Legal Researcher, Bangalore',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      content: 'The legal library is incredibly comprehensive. AI-powered summaries help me understand complex judgments quickly.',
      rating: 5
    }
  ];

  const stats = [
    { value: '98%', label: 'Client Satisfaction' },
    { value: '10M+', label: 'Legal Queries Resolved' },
    { value: '2,500+', label: 'Active Lawyers' },
    { value: '150+', label: 'Cities Covered' }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-sky-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats section */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Trusted by Legal Professionals Across India
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto">
            Our platform has helped thousands of lawyers and clients navigate the legal system more efficiently.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{stat.value}</div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-12">
            What Our Users Say
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200"
              >
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-sky-400 mb-4" />

                {/* Content */}
                <p className="text-slate-600 mb-6 leading-relaxed">
                  &quot;{testimonial.content}&quot;
                </p>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* User info */}
                <div className="flex items-center">
                  <Image
                    width={48}
                    height={48}
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
