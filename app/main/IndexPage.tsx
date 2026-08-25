'use client';

import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/sections/HeroSection';
import ServicesSection from '@/components/sections/ServicesSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import Footer from '@/components/layout/Footer';

const Index = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <TestimonialsSection />
            <Footer />
        </div>
    );
};

export default Index;
