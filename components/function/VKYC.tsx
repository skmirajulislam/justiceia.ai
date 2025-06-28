'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Camera, CheckCircle, Scale, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getProfileAction } from '@/lib/database-actions';
import Navbar from '@/components/layout/Navbar';

const basicFormSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    phone: z.string().regex(/^(\+?\d{1,4}?)?\d{9,10}$/, "Invalid phone number format."),
});

const fullFormSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    phone: z.string().regex(/^(\+?\d{1,4}?)?\d{9,10}$/, "Invalid phone number format."),
    aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar number must be a 12-digit number."),
    panNumber: z.string().regex(/^([A-Z]{5}[0-9]{4}[A-Z]{1})$/, "Invalid PAN number format."),
    address: z.string().min(10, "Address must be at least 10 characters."),
});

type BasicFormData = z.infer<typeof basicFormSchema>;
type FullFormData = z.infer<typeof fullFormSchema>;

interface Profile {
    id: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    kyc_type?: 'basic' | 'full';
    role?: string;
    vkyc_completed?: boolean;
}

interface CapturedPhotos {
    selfie?: { url: string; uploading: boolean };
    aadhaarFront?: { url: string; uploading: boolean };
    aadhaarBack?: { url: string; uploading: boolean };
    panCard?: { url: string; uploading: boolean };
}

// Camera Modal Component (unchanged - keeping it as is)
const CameraModal = ({
    isOpen,
    onClose,
    onCapture,
    title
}: {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageData: string) => void;
    title: string;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const startCamera = async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (stream) {
                stream.getTracks().forEach(track => {
                    track.stop();
                });
                setStream(null);
            }

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    setIsLoading(false);
                };
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Failed to access camera. Please check permissions.');
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        console.log('Stopping camera...');
        if (stream) {
            stream.getTracks().forEach(track => {
                console.log('Stopping track:', track.kind);
                track.stop();
            });
            setStream(null);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        stopCamera();

        onCapture(imageData);
        onClose();
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, facingMode]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-4">
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    <p>Starting camera...</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center p-4">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">{error}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={startCamera}
                                        className="mt-2"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ display: isLoading || error ? 'none' : 'block' }}
                        />

                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {!isLoading && !error && (
                            <div className="absolute top-2 right-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={switchCamera}
                                    className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={capturePhoto}
                            disabled={isLoading || !!error}
                            className="flex-1"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Capture
                        </Button>
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VKYC = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { session, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCamera, setShowCamera] = useState<string | false>(false);
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotos>({});

    // Determine which form schema to use based on user role
    const isFullKYC = profile?.role && ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(profile.role);

    const basicForm = useForm<BasicFormData>({
        resolver: zodResolver(basicFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: ''
        },
    });

    const fullForm = useForm<FullFormData>({
        resolver: zodResolver(fullFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            aadhaarNumber: '',
            panNumber: '',
            address: '',
        },
    });

    useEffect(() => {
        const checkAuth = async () => {
            if (authLoading) return;

            if (!session) {
                router.push('/auth');
                return;
            }

            try {
                const profileData = await getProfileAction(session.user.id);

                if (!profileData) {
                    router.push('/auth');
                    return;
                }

                setProfile({
                    ...profileData,
                    first_name: profileData.first_name ?? undefined,
                    last_name: profileData.last_name ?? undefined,
                    phone: profileData.phone ?? undefined,
                    address: profileData.address ?? undefined,
                    role: profileData.role ?? undefined,
                    vkyc_completed: profileData.vkyc_completed ?? undefined,
                });

                // If VKYC is already completed, redirect to profile
                if (profileData.vkyc_completed) {
                    router.push('/');
                    return;
                }

                // Pre-populate form with existing data
                const baseData = {
                    firstName: profileData.first_name || '',
                    lastName: profileData.last_name || '',
                    phone: profileData.phone || ''
                };

                if (isFullKYC) {
                    fullForm.reset({
                        ...baseData,
                        aadhaarNumber: '',
                        panNumber: '',
                        address: profileData.address || '',
                    });
                } else {
                    basicForm.reset(baseData);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/auth');
            }
        };

        checkAuth();
    }, [session, authLoading, router, isFullKYC, fullForm, basicForm]);

    const uploadPhotoToCloudinary = async (imageData: string, documentType: string): Promise<string | null> => {
        try {
            const response = await fetch('/api/vkyc/upload-photo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData,
                    documentType
                }),
            });

            const data = await response.json();

            if (response.ok) {
                return data.url;
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            return null;
        }
    };

    const handleCameraCapture = async (imageData: string) => {
        if (typeof showCamera === 'string') {
            const documentType = showCamera;

            // Set uploading state
            setCapturedPhotos(prev => ({
                ...prev,
                [documentType]: { url: imageData, uploading: true }
            }));

            // Close camera modal immediately
            setShowCamera(false);

            // Upload to Cloudinary
            const uploadedUrl = await uploadPhotoToCloudinary(imageData, documentType);

            if (uploadedUrl) {
                setCapturedPhotos(prev => ({
                    ...prev,
                    [documentType]: { url: uploadedUrl, uploading: false }
                }));

                toast({
                    title: "Photo Uploaded",
                    description: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} photo uploaded successfully!`,
                });
            } else {
                setCapturedPhotos(prev => ({
                    ...prev,
                    [documentType]: undefined
                }));

                toast({
                    title: "Upload Failed",
                    description: "Failed to upload photo. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const onSubmit = async (values: BasicFormData | FullFormData) => {
        if (!session) return;

        // Check if at least selfie is captured and uploaded
        if (!capturedPhotos.selfie?.url || capturedPhotos.selfie.uploading) {
            toast({
                title: "Missing Photo",
                description: "Please capture and upload your selfie to complete KYC.",
                variant: "destructive",
            });
            return;
        }

        // For full KYC, check if all required documents are captured and uploaded
        if (isFullKYC) {
            const requiredDocs = ['aadhaarFront', 'aadhaarBack', 'panCard'];
            const missingDocs = requiredDocs.filter(doc =>
                !capturedPhotos[doc as keyof CapturedPhotos]?.url ||
                capturedPhotos[doc as keyof CapturedPhotos]?.uploading
            );

            if (missingDocs.length > 0) {
                toast({
                    title: "Missing Documents",
                    description: "Please capture and upload all required documents for full KYC verification.",
                    variant: "destructive",
                });
                return;
            }
        }

        setIsLoading(true);

        try {
            // Prepare profile update data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profileData: any = {
                first_name: values.firstName,
                last_name: values.lastName,
                phone: values.phone,
            };

            if (isFullKYC && 'address' in values) {
                profileData.address = values.address;
            }

            // Prepare documents data
            const documents = [];

            if (capturedPhotos.selfie?.url) {
                documents.push({
                    type: 'selfie',
                    url: capturedPhotos.selfie.url
                });
            }

            if (isFullKYC) {
                if (capturedPhotos.aadhaarFront?.url) {
                    documents.push({
                        type: 'aadhaar_front',
                        url: capturedPhotos.aadhaarFront.url
                    });
                }

                if (capturedPhotos.aadhaarBack?.url) {
                    documents.push({
                        type: 'aadhaar_back',
                        url: capturedPhotos.aadhaarBack.url
                    });
                }

                if (capturedPhotos.panCard?.url) {
                    documents.push({
                        type: 'pan_card',
                        url: capturedPhotos.panCard.url
                    });
                }
            }

            // Submit VKYC completion
            const response = await fetch('/api/vkyc/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    profileData,
                    documents
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "VKYC Completed!",
                    description: "Your verification is complete. Welcome to the platform!",
                });

                // Redirect to platform after successful completion
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } else {
                throw new Error(data.error || 'VKYC completion failed');
            }

        } catch (error: unknown) {
            console.error('VKYC submission error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to complete VKYC. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || !session || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="pt-24 px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-4">
                                <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-2 rounded-lg">
                                    <Scale className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-xl font-bold text-slate-900">JusticeIA.ai</span>
                            </div>
                            <CardTitle className="text-2xl">
                                {`${isFullKYC ? 'Full' : 'Basic'} KYC Verification`}
                            </CardTitle>
                            <CardDescription>
                                {isFullKYC
                                    ? 'Complete your full verification with documents to access all legal services'
                                    : 'Complete your basic verification to access legal services'
                                }
                            </CardDescription>
                            {isFullKYC && (
                                <div className="flex items-center justify-center space-x-2 mt-2 p-2 bg-blue-50 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm text-blue-600">
                                        Full KYC required for {profile.role?.replace('_', ' ')} role
                                    </span>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {isFullKYC ? (
                                <Form {...fullForm}>
                                    <form onSubmit={fullForm.handleSubmit(onSubmit)} className="space-y-6">
                                        {/* Personal Information */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Personal Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={fullForm.control}
                                                    name="firstName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>First Name</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter your first name" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={fullForm.control}
                                                    name="lastName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Last Name</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter your last name" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={fullForm.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone Number</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter your phone number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={fullForm.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Address</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter your complete address" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Document Information */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Document Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={fullForm.control}
                                                    name="aadhaarNumber"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Aadhaar Number</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter 12-digit Aadhaar number" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={fullForm.control}
                                                    name="panNumber"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>PAN Number</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter PAN number" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Document Upload - Common section for both forms */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Document Upload</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Selfie - Required for all KYC types */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Selfie *</label>
                                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                                                        {capturedPhotos.selfie ? (
                                                            <div className="space-y-2">
                                                                <div className="relative w-full h-32 rounded overflow-hidden">
                                                                    <Image
                                                                        src={capturedPhotos.selfie.url}
                                                                        alt="Selfie"
                                                                        fill
                                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                                        className="object-cover"
                                                                        priority
                                                                    />
                                                                    {capturedPhotos.selfie.uploading && (
                                                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {capturedPhotos.selfie.uploading ? (
                                                                    <div className="flex items-center justify-center text-blue-600">
                                                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                        <span className="text-sm">Uploading...</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center text-green-600">
                                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                                        <span className="text-sm">Uploaded</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => setShowCamera('selfie')}
                                                                className="w-full"
                                                            >
                                                                <Camera className="w-4 h-4 mr-2" />
                                                                Take Selfie
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Additional documents for Full KYC only */}
                                                {isFullKYC && (
                                                    <>
                                                        {/* Aadhaar Front */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Aadhaar Front *</label>
                                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                                                                {capturedPhotos.aadhaarFront ? (
                                                                    <div className="space-y-2">
                                                                        <div className="relative w-full h-32 rounded overflow-hidden">
                                                                            <Image
                                                                                src={capturedPhotos.aadhaarFront.url}
                                                                                alt="Aadhaar Front"
                                                                                fill
                                                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                                                className="object-cover"
                                                                            />
                                                                            {capturedPhotos.aadhaarFront.uploading && (
                                                                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {capturedPhotos.aadhaarFront.uploading ? (
                                                                            <div className="flex items-center justify-center text-blue-600">
                                                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                                <span className="text-sm">Uploading...</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-center text-green-600">
                                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                                <span className="text-sm">Uploaded</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => setShowCamera('aadhaarFront')}
                                                                        className="w-full"
                                                                    >
                                                                        <Camera className="w-4 h-4 mr-2" />
                                                                        Capture Aadhaar Front
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Aadhaar Back */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Aadhaar Back *</label>
                                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                                                                {capturedPhotos.aadhaarBack ? (
                                                                    <div className="space-y-2">
                                                                        <div className="relative w-full h-32 rounded overflow-hidden">
                                                                            <Image
                                                                                src={capturedPhotos.aadhaarBack.url}
                                                                                alt="Aadhaar Back"
                                                                                fill
                                                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                                                className="object-cover"
                                                                            />
                                                                            {capturedPhotos.aadhaarBack.uploading && (
                                                                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {capturedPhotos.aadhaarBack.uploading ? (
                                                                            <div className="flex items-center justify-center text-blue-600">
                                                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                                <span className="text-sm">Uploading...</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-center text-green-600">
                                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                                <span className="text-sm">Uploaded</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => setShowCamera('aadhaarBack')}
                                                                        className="w-full"
                                                                    >
                                                                        <Camera className="w-4 h-4 mr-2" />
                                                                        Capture Aadhaar Back
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* PAN Card */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">PAN Card *</label>
                                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                                                                {capturedPhotos.panCard ? (
                                                                    <div className="space-y-2">
                                                                        <div className="relative w-full h-32 rounded overflow-hidden">
                                                                            <Image
                                                                                src={capturedPhotos.panCard.url}
                                                                                alt="PAN Card"
                                                                                fill
                                                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                                                className="object-cover"
                                                                            />
                                                                            {capturedPhotos.panCard.uploading && (
                                                                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {capturedPhotos.panCard.uploading ? (
                                                                            <div className="flex items-center justify-center text-blue-600">
                                                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                                <span className="text-sm">Uploading...</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-center text-green-600">
                                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                                <span className="text-sm">Uploaded</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => setShowCamera('panCard')}
                                                                        className="w-full"
                                                                    >
                                                                        <Camera className="w-4 h-4 mr-2" />
                                                                        Capture PAN Card
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading ? "Completing VKYC..." : "Complete Full VKYC"}
                                        </Button>
                                    </form>
                                </Form>
                            ) : (
                                <Form {...basicForm}>
                                    <form onSubmit={basicForm.handleSubmit(onSubmit)} className="space-y-6">
                                        {/* Personal Information */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Personal Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={basicForm.control}
                                                    name="firstName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>First Name</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter your first name" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={basicForm.control}
                                                    name="lastName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Last Name</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter your last name" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={basicForm.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone Number</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter your phone number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Document Upload */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Document Upload</h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {/* Selfie - Required for all KYC types */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Selfie *</label>
                                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                                                        {capturedPhotos.selfie ? (
                                                            <div className="space-y-2">
                                                                <div className="relative w-full h-32 rounded overflow-hidden">
                                                                    <Image
                                                                        src={capturedPhotos.selfie.url}
                                                                        alt="Selfie"
                                                                        fill
                                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                                        className="object-cover"
                                                                        priority
                                                                    />
                                                                    {capturedPhotos.selfie.uploading && (
                                                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {capturedPhotos.selfie.uploading ? (
                                                                    <div className="flex items-center justify-center text-blue-600">
                                                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                        <span className="text-sm">Uploading...</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center text-green-600">
                                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                                        <span className="text-sm">Uploaded</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => setShowCamera('selfie')}
                                                                className="w-full"
                                                            >
                                                                <Camera className="w-4 h-4 mr-2" />
                                                                Take Selfie
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading ? "Completing VKYC..." : "Complete Basic VKYC"}
                                        </Button>
                                    </form>
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <CameraModal
                    isOpen={!!showCamera}
                    onClose={() => setShowCamera(false)}
                    onCapture={handleCameraCapture}
                    title={`Capture ${showCamera ? showCamera.charAt(0).toUpperCase() + showCamera.slice(1) : ''}`}
                />
            </div>
        </div>
    );
};

export default VKYC;