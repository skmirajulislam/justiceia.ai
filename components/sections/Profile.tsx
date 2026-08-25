'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
    User, Settings, Trash2, CheckCircle, Clock, FileText, 
    AlertTriangle, ShieldCheck, Briefcase, Award, IndianRupee, 
    GraduationCap, Globe, BookOpen, MapPin, Camera, Loader2, KeyRound, Lock, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';

const formSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    phone: z.string().min(10, "Phone number must be at least 10 characters.").optional().or(z.literal('')),
    address: z.string().optional(),
    role: z.string().optional(),
    experience: z.coerce.number().min(0, "Experience cannot be negative").max(70).optional(),
    hourlyRate: z.coerce.number().min(0, "Hourly rate cannot be negative").optional(),
    specialization: z.string().optional(),
    location: z.string().optional(),
    education: z.string().optional(),
    languages: z.string().optional(),
    certifications: z.string().optional(),
    bio: z.string().optional(),
});

interface Report {
    id: string;
    title: string;
    category: string;
    created_at: Date | null;
}

interface AdvocateProfileData {
    id?: string;
    specialization?: string[];
    experience?: number;
    hourly_rate?: number;
    bio?: string;
    education?: string;
    certifications?: string[];
    languages?: string[];
    location?: string;
    image_url?: string | null;
    is_verified?: boolean;
}

interface VkycCertData {
    certificate_id: string;
    auth_token: string;
    sha256_hash: string;
    tamper_proof_status?: string;
    digital_seal_authority?: string;
}

interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    role: string | null;
    avatar_url?: string | null;
    avatar_key?: string | null;
    vkyc_completed: boolean | null;
    vkyc_completed_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    reports: Report[];
    advocateProfile?: AdvocateProfileData | null;
    vkycCertificate?: VkycCertData | null;
}

const Profile = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { session, loading, refreshSession } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [showVkycRequiredModal, setShowVkycRequiredModal] = useState(false);
    
    // Delete Profile Modal state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteCertId, setDeleteCertId] = useState('');
    const [deleteAuthToken, setDeleteAuthToken] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            role: 'REGULAR_USER',
            experience: 0,
            hourlyRate: 0,
            specialization: '',
            location: '',
            education: '',
            languages: '',
            certifications: '',
            bio: '',
        },
    });

    useEffect(() => {
        if (loading) return;

        if (!session) {
            router.push('/auth');
            return;
        }

        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile/${session.user.id}`);

                if (response.ok) {
                    const profileData = await response.json();
                    setProfile(profileData);

                    // Normalize role to match SelectItem values
                    let normalizedRole = 'REGULAR_USER';
                    if (profileData.role) {
                        const r = String(profileData.role).toUpperCase();
                        if (['REGULAR_USER', 'LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(r)) {
                            normalizedRole = r;
                        } else if (r === 'USER') {
                            normalizedRole = 'REGULAR_USER';
                        }
                    }

                    form.reset({
                        firstName: profileData.first_name || '',
                        lastName: profileData.last_name || '',
                        email: profileData.email || '',
                        phone: profileData.phone || '',
                        address: profileData.address || '',
                        role: normalizedRole,
                        experience: profileData.advocateProfile?.experience ?? 0,
                        hourlyRate: profileData.advocateProfile?.hourly_rate ?? 0,
                        specialization: Array.isArray(profileData.advocateProfile?.specialization)
                            ? profileData.advocateProfile.specialization.join(', ')
                            : profileData.advocateProfile?.specialization || '',
                        location: profileData.advocateProfile?.location || profileData.address || '',
                        education: profileData.advocateProfile?.education || '',
                        languages: Array.isArray(profileData.advocateProfile?.languages)
                            ? profileData.advocateProfile.languages.join(', ')
                            : profileData.advocateProfile?.languages || '',
                        certifications: Array.isArray(profileData.advocateProfile?.certifications)
                            ? profileData.advocateProfile.certifications.join(', ')
                            : profileData.advocateProfile?.certifications || '',
                        bio: profileData.advocateProfile?.bio || '',
                    });
                } else if (response.status === 404) {
                    router.push('/create-profile');
                }
            } catch (error) {
                console.error('Profile fetch error:', error);
                toast({
                    title: "Error",
                    description: "Failed to load profile data.",
                    variant: "destructive",
                });
            }
        };

        fetchProfile();
    }, [session, loading, router, form, toast]);

    const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid file",
                description: "Please select an image file (PNG, JPG, JPEG, WEBP).",
                variant: "destructive"
            });
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Profile photo must be less than 8MB.",
                variant: "destructive"
            });
            return;
        }

        setIsUploadingAvatar(true);
        try {
            // Convert file to Base64 to ensure 100% reliable transport across all network/browser environments
            const base64Promise = new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });

            const base64Image = await base64Promise;

            const response = await fetch('/api/profile/upload-avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64Image,
                    fileName: file.name,
                    fileType: file.type
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload photo');
            }

            setProfile(prev => prev ? {
                ...prev,
                avatar_url: data.avatar_url,
                avatar_key: data.avatar_key
            } : null);

            await refreshSession();

            toast({
                title: "Profile Photo Updated",
                description: "New image uploaded and previous photo cleared from cloud storage.",
            });
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            toast({
                title: "Upload Failed",
                description: err.message || "Failed to upload new profile photo.",
                variant: "destructive"
            });
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!session) return;

        setIsLoading(true);

        try {
            const response = await fetch(`/api/profile/${session.user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const data = await response.json();
            const updatedProfile = data.profile || data;
            setProfile(updatedProfile);

            toast({
                title: "Profile Updated",
                description: data.message || "Profile updated successfully!",
            });

            // If the user is an advocate/professional, their VKYC has been reset and they must re-verify
            if (data.requires_vkyc || !updatedProfile.vkyc_completed) {
                const isProf = ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(String(updatedProfile.role).toUpperCase());
                if (isProf) {
                    setShowVkycRequiredModal(true);
                }
            }

        } catch (error: unknown) {
            console.error('Profile update error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!session) return;

        const hasCert = Boolean(profile?.vkycCertificate);

        if (hasCert) {
            if (!deleteCertId.trim() || !deleteAuthToken.trim()) {
                setDeleteError("Both Certificate ID and Auth Token are required for verification.");
                return;
            }
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/profile/${session.user.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    certificateId: deleteCertId.trim(),
                    authToken: deleteAuthToken.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete account');
            }

            toast({
                title: "Account Permanently Deleted",
                description: "Your profile, credentials, and records have been deleted.",
            });

            setIsDeleteDialogOpen(false);
            window.location.href = '/';

        } catch (error: any) {
            console.error('Account deletion error:', error);
            setDeleteError(error.message || "Failed to delete account. Please verify credentials.");
            toast({
                title: "Deletion Failed",
                description: error.message || "Security authorization failed.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
                <Navbar />
                <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    const isProfessionalUser = profile?.role && ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(profile.role);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
            <Navbar />
            <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Info Card */}
                    <Card>
                        <CardHeader className="text-center">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarFileSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="relative w-24 h-24 mx-auto mb-4 group">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 dark:bg-slate-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow-md">
                                    {isUploadingAvatar ? (
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                            <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                                            <span className="text-[10px] text-sky-200">Uploading...</span>
                                        </div>
                                    ) : (profile?.avatar_url || profile?.advocateProfile?.image_url) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={profile.avatar_url || profile.advocateProfile?.image_url || ''}
                                            alt="Profile Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-12 h-12 text-white" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    title="Upload / Change Profile Photo"
                                    className="absolute bottom-0 right-0 p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <CardTitle>
                                {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User Profile' : 'Loading...'}
                            </CardTitle>
                            <CardDescription>{profile?.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">Role:</span>
                                <span className="text-slate-600 font-semibold">{profile?.role || 'REGULAR_USER'}</span>
                            </div>

                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">KYC Status:</span>
                                <div className="flex items-center space-x-1">
                                    {profile?.vkyc_completed ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-green-600 text-sm font-medium">Completed</span>
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-4 h-4 text-amber-500" />
                                            <span className="text-amber-600 text-sm font-medium">Pending VKYC</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isProfessionalUser && !profile?.vkyc_completed && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2">
                                    <div className="flex items-center gap-1.5 font-semibold">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Action Required</span>
                                    </div>
                                    <p>Your advocate profile requires completing Video KYC verification before accessing other features.</p>
                                    <Button
                                        size="sm"
                                        onClick={() => router.push('/vkyc')}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs h-8"
                                    >
                                        Complete Video KYC Now
                                    </Button>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">Reports:</span>
                                <div className="flex items-center space-x-1 text-sky-600">
                                    <FileText className="w-4 h-4" />
                                    <span>{profile?.reports?.length || 0}</span>
                                </div>
                            </div>

                            {isProfessionalUser && (
                                <div className="pt-2 space-y-2 text-xs text-slate-600 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Experience:</span>
                                        <span className="font-semibold text-slate-800">{profile?.advocateProfile?.experience ?? 0} Years</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Consultation Rate:</span>
                                        <span className="font-semibold text-slate-800">₹{profile?.advocateProfile?.hourly_rate ?? 0}/hr</span>
                                    </div>
                                    {profile?.advocateProfile?.specialization && profile.advocateProfile.specialization.length > 0 && (
                                        <div className="pt-1">
                                            <span className="font-medium block mb-1">Specializations:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {profile.advocateProfile.specialization.map((spec, i) => (
                                                    <span key={i} className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-[11px] font-medium border border-sky-200">
                                                        {spec}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Edit Profile Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center space-x-2">
                                    <Settings className="w-5 h-5 text-slate-700" />
                                    <span className="font-semibold text-lg">Edit Profile</span>
                                </div>
                                <CardDescription>
                                    Update your personal information, role, and professional legal credentials
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
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
                                                control={form.control}
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
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your email" {...field} disabled />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
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
                                            control={form.control}
                                            name="address"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Address</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your address" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Role</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || 'REGULAR_USER'}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select your role" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="REGULAR_USER">Regular User</SelectItem>
                                                            <SelectItem value="LAWYER">Lawyer</SelectItem>
                                                            <SelectItem value="BARRISTER">Barrister</SelectItem>
                                                            <SelectItem value="GOVERNMENT_OFFICIAL">Government Official</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Professional Advocate Details Section */}
                                        {['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(form.watch('role') || profile?.role || '') && (
                                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                                <div className="flex items-center space-x-2 text-slate-800 pb-1">
                                                    <Briefcase className="w-5 h-5 text-sky-600" />
                                                    <h3 className="font-semibold text-base">Legal Practice & Professional Details</h3>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    These details are displayed on your advocate profile and the official legal verification affidavit.
                                                </p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="experience"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="flex items-center gap-1.5">
                                                                    <Award className="w-4 h-4 text-slate-500" />
                                                                    Experience (Years)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        max="70"
                                                                        placeholder="e.g. 5"
                                                                        {...field}
                                                                        value={field.value ?? 0}
                                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="hourlyRate"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="flex items-center gap-1.5">
                                                                    <IndianRupee className="w-4 h-4 text-slate-500" />
                                                                    Hourly Consultation Rate (₹)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="e.g. 1500"
                                                                        {...field}
                                                                        value={field.value ?? 0}
                                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="specialization"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1.5">
                                                                <BookOpen className="w-4 h-4 text-slate-500" />
                                                                Areas of Specialization (comma-separated)
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. Criminal Law, Corporate Law, Civil Litigation, Family Law" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="location"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="flex items-center gap-1.5">
                                                                    <MapPin className="w-4 h-4 text-slate-500" />
                                                                    Office / Chamber Location
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="e.g. High Court, Kolkata, West Bengal" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="languages"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="flex items-center gap-1.5">
                                                                    <Globe className="w-4 h-4 text-slate-500" />
                                                                    Practicing Languages (comma-separated)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="e.g. English, Bengali, Hindi" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="education"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1.5">
                                                                <GraduationCap className="w-4 h-4 text-slate-500" />
                                                                Education & Degrees
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. LL.B (Hons), LL.M (Corporate Law)" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="certifications"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1.5">
                                                                <Award className="w-4 h-4 text-slate-500" />
                                                                Bar Council Reg / Certifications (comma-separated)
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. Bar Council of West Bengal, Reg #WB/1234/2020" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="bio"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Professional Bio / Summary</FormLabel>
                                                            <FormControl>
                                                                <Textarea
                                                                    rows={3}
                                                                    placeholder="Describe your legal experience, expertise, and courtroom practice..."
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-2">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => {
                                                    setDeleteCertId('');
                                                    setDeleteAuthToken('');
                                                    setDeleteError(null);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                className="flex items-center space-x-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span>Delete Account</span>
                                            </Button>

                                            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white">
                                                {isLoading ? "Saving..." : "Save Changes"}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Secure Delete Account Modal with VKYC Verification */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-1">
                            <ShieldAlert className="w-6 h-6 shrink-0" />
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                Delete Account & Accreditations
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                            This action is permanent and irreversible. All personal data, reports, and consultation logs will be erased from our database and cloud storage.
                        </DialogDescription>
                    </DialogHeader>

                    {profile?.vkycCertificate ? (
                        <div className="space-y-3 py-2">
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-800 dark:text-red-300 space-y-1">
                                <p className="font-semibold flex items-center gap-1.5">
                                    <KeyRound className="w-4 h-4" />
                                    Cryptographic Verification Required
                                </p>
                                <p>
                                    As a verified legal practitioner, please provide your VKYC Certificate ID and Auth Token to authorize permanent credential revocation and account deletion.
                                </p>
                            </div>

                            {deleteError && (
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 rounded text-xs font-medium">
                                    {deleteError}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    VKYC Certificate ID
                                </label>
                                <Input
                                    placeholder="e.g. JAI-VKYC-2026-..."
                                    value={deleteCertId}
                                    onChange={(e) => setDeleteCertId(e.target.value)}
                                    className="text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Authorization Token
                                </label>
                                <Input
                                    placeholder="e.g. JAI-AUTH-..."
                                    value={deleteAuthToken}
                                    onChange={(e) => setDeleteAuthToken(e.target.value)}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-2 text-xs text-slate-600 dark:text-slate-400">
                            {deleteError && (
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 rounded text-xs font-medium mb-3">
                                    {deleteError}
                                </div>
                            )}
                            Are you sure you want to delete your profile? This cannot be undone.
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || (Boolean(profile?.vkycCertificate) && (!deleteCertId.trim() || !deleteAuthToken.trim()))}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Verifying & Deleting...
                                </>
                            ) : (
                                "Permanently Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mandatory Re-VKYC Modal Popup for Advocates */}
            <AlertDialog open={showVkycRequiredModal} onOpenChange={setShowVkycRequiredModal}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center space-x-2 text-amber-600 mb-2">
                            <ShieldCheck className="w-6 h-6" />
                            <AlertDialogTitle className="text-lg font-bold text-slate-900">
                                Video KYC Verification Required
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="text-sm text-slate-600 space-y-2">
                                <p>
                                    Because your advocate profile details have been updated, our security and legal compliance policy requires you to re-complete Video KYC verification.
                                </p>
                                <p className="font-semibold text-slate-800">
                                    Old verification documents have been cleared from cloud storage. You will be restricted from accessing consultations and legal features until you complete your new Video KYC.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
                        <AlertDialogCancel onClick={() => setShowVkycRequiredModal(false)}>
                            Stay on Profile
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => router.push('/vkyc')}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                        >
                            Proceed to Video KYC
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Profile;