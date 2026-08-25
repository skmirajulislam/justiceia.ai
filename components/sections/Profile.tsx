'use client';

import { useState, useEffect } from 'react';
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
import { 
    User, Settings, Trash2, CheckCircle, Clock, FileText, 
    AlertTriangle, ShieldCheck, Briefcase, Award, IndianRupee, 
    GraduationCap, Globe, BookOpen, MapPin 
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
    is_verified?: boolean;
}

interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    role: string | null;
    vkyc_completed: boolean | null;
    vkyc_completed_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    reports: Report[];
    advocateProfile?: AdvocateProfileData | null;
}

const Profile = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { session, loading } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showVkycRequiredModal, setShowVkycRequiredModal] = useState(false);

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

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/profile/${session.user.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted.",
            });

            window.location.href = '/';

        } catch (error: unknown) {
            console.error('Account deletion error:', error);
            toast({
                title: "Error",
                description: "Failed to delete account. Please contact support.",
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
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-10 h-10 text-white" />
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
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" variant="destructive" className="flex items-center space-x-2">
                                                        <Trash2 className="w-4 h-4" />
                                                        <span>Delete Account</span>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete your account
                                                            and remove all your data from our servers, including all reports and VKYC records.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={handleDeleteAccount}
                                                            disabled={isDeleting}
                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            {isDeleting ? "Deleting..." : "Delete Account"}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

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