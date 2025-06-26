'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, Star, MapPin, Phone, MessageCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Image from 'next/image';

interface Lawyer {
    id: string;
    name: string;
    specialization: string;
    experience: number;
    rating: number;
    location: string;
    rate: number;
    available: boolean;
    image: string;
    languages: string[];
}

const VideoConsult = () => {
    const [selectedSpecialization, setSelectedSpecialization] = useState('all');

    const lawyers: Lawyer[] = [
        {
            id: '1',
            name: 'Adv. Priya Sharma',
            specialization: 'Corporate Law',
            experience: 12,
            rating: 4.8,
            location: 'Delhi',
            rate: 2500,
            available: true,
            image: 'https://rbo6om9l82.ufs.sh/f/or07poavtUuSHZyIfA6cYuFzfnxOvmJDpeILslVNEPk4Bhyi',
            languages: ['Hindi', 'English']
        },
        {
            id: '2',
            name: 'Adv. Rajesh Kumar',
            specialization: 'Criminal Law',
            experience: 15,
            rating: 4.9,
            location: 'Mumbai',
            rate: 3000,
            available: true,
            image: 'https://rbo6om9l82.ufs.sh/f/or07poavtUuSvTCesN3qYPZgjuhsNkzxMVdJeoCr3GIHcB5U',
            languages: ['Hindi', 'English', 'Marathi']
        },
        {
            id: '3',
            name: 'Adv. Meera Patel',
            specialization: 'Family Law',
            experience: 8,
            rating: 4.7,
            location: 'Bangalore',
            rate: 2000,
            available: false,
            image: 'https://rbo6om9l82.ufs.sh/f/or07poavtUuSmte3wDQWPqGBKui27bJUenZ3cHEOgpQY1tjv',
            languages: ['Hindi', 'English', 'Gujarati']
        },
        {
            id: '4',
            name: 'Adv. Arjun Singh',
            specialization: 'Constitutional Law',
            experience: 20,
            rating: 4.9,
            location: 'Chennai',
            rate: 4000,
            available: true,
            image: 'https://rbo6om9l82.ufs.sh/f/or07poavtUuSAuqWAA8tarEUqGVQDh4KJmBTcS0Oey5glLPd',
            languages: ['Hindi', 'English', 'Tamil']
        }
    ];

    const specializations = ['all', 'Corporate Law', 'Criminal Law', 'Family Law', 'Constitutional Law', 'Civil Law'];

    const filteredLawyers = lawyers.filter(lawyer =>
        selectedSpecialization === 'all' || lawyer.specialization === selectedSpecialization
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="container mx-auto px-4 pt-20 pb-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <Video className="w-8 h-8 text-sky-500" />
                            <h1 className="text-3xl font-bold text-slate-900">Video Consultation</h1>
                        </div>
                        <p className="text-slate-600">Connect with expert lawyers for personalized legal advice</p>
                    </div>

                    {/* Filter Section */}
                    <Card className="mb-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-slate-700">Filter by specialization:</span>
                                    <select
                                        value={selectedSpecialization}
                                        onChange={(e) => setSelectedSpecialization(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-md bg-white"
                                    >
                                        {specializations.map(spec => (
                                            <option key={spec} value={spec}>
                                                {spec === 'all' ? 'All Specializations' : spec}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-slate-600">
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Available Now</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span>Busy</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lawyers Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredLawyers.map((lawyer) => (
                            <Card key={lawyer.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start space-x-4">
                                        <Image
                                            width={64}
                                            height={64}
                                            src={lawyer.image}
                                            alt={lawyer.name}
                                            className="w-16 h-16 rounded-full object-cover bg-slate-200"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <CardTitle className="text-lg">{lawyer.name}</CardTitle>
                                                <div className={`w-3 h-3 rounded-full ${lawyer.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            </div>
                                            <CardDescription className="text-sm">
                                                {lawyer.specialization}
                                            </CardDescription>
                                            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                                                <div className="flex items-center space-x-1">
                                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                    <span>{lawyer.rating}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{lawyer.experience}+ years</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                                            <MapPin className="w-4 h-4" />
                                            <span>{lawyer.location}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {lawyer.languages.map((lang, index) => (
                                                <Badge key={index} variant="secondary" className="text-xs">
                                                    {lang}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="text-lg font-semibold text-sky-600">
                                            ₹{lawyer.rate}/hour
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Button
                                            className="w-full"
                                            disabled={!lawyer.available}
                                        >
                                            <Video className="w-4 h-4 mr-2" />
                                            {lawyer.available ? 'Book Video Call' : 'Currently Busy'}
                                        </Button>
                                        <div className="flex space-x-2">
                                            <Button variant="outline" size="sm" className="flex-1">
                                                <Phone className="w-4 h-4 mr-1" />
                                                Call
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1">
                                                <MessageCircle className="w-4 h-4 mr-1" />
                                                Message
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Emergency Consultation */}
                    <Card className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-800">Need Urgent Legal Help?</CardTitle>
                            <CardDescription className="text-red-600">
                                Our emergency consultation service is available 24/7 for critical legal matters.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="bg-red-600 hover:bg-red-700">
                                <Phone className="w-4 h-4 mr-2" />
                                Emergency Consultation
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default VideoConsult;