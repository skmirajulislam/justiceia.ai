'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Settings, Trash2, CheckCircle, Clock, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
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
});

interface Report {
    id: string;
    title: string;
    category: string;
    created_at: Date | null;
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
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-64 bg-slate-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    const isProfessionalUser = profile?.role && ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(profile.role);

    return (
        <div className="min-h-screen bg-slate-50">
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
                        </CardContent>
                    </Card>

                    {/* Edit Profile Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center space-x-2">
                                    <Settings className="w-5 h-5" />
                                    <span>Edit Profile</span>
                                </div>
                                <CardDescription>
                                    Update your personal information and account settings
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
                        <AlertDialogDescription className="text-sm text-slate-600 space-y-2">
                            <p>
                                Because your advocate profile details have been updated, our security and legal compliance policy requires you to re-complete Video KYC verification.
                            </p>
                            <p className="font-semibold text-slate-800">
                                Old verification documents have been cleared from cloud storage. You will be restricted from accessing consultations and legal features until you complete your new Video KYC.
                            </p>
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