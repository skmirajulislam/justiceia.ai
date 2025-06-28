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
import { User, Settings, Trash2, CheckCircle, Clock, FileText } from 'lucide-react';
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

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            role: '',
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
                    form.reset({
                        firstName: profileData.first_name || '',
                        lastName: profileData.last_name || '',
                        email: profileData.email || '',
                        phone: profileData.phone || '',
                        address: profileData.address || '',
                        role: profileData.role || '',
                    });
                } else if (response.status === 404) {
                    // Profile doesn't exist, redirect to create profile page
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

            const updatedProfile = await response.json();
            setProfile(updatedProfile);

            toast({
                title: "Profile Updated",
                description: "Profile updated successfully!",
            });

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

            // Clear any auth state and redirect to home
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

    if (loading || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="pt-24 px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Info Card */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader className="text-center">
                                    <div className="flex items-center justify-center mb-4">
                                        <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-4 rounded-full">
                                            <User className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                    <CardTitle>
                                        {profile.first_name} {profile.last_name}
                                    </CardTitle>
                                    <CardDescription>{profile.email}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Role:</span>
                                        <span className="text-sm text-slate-600 capitalize">
                                            {profile.role?.replace('_', ' ') || 'Not set'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">KYC Status:</span>
                                        <div className="flex items-center space-x-1">
                                            {profile.vkyc_completed ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm text-green-600">Completed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="w-4 h-4 text-orange-500" />
                                                    <span className="text-sm text-orange-600">Pending</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Reports:</span>
                                        <div className="flex items-center space-x-1">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm text-slate-600">{profile.reports?.length || 0}</span>
                                        </div>
                                    </div>
                                    {!profile.vkyc_completed && (
                                        <Button asChild className="w-full">
                                            <a href="/vkyc">Complete KYC</a>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Profile Edit Form */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Settings className="w-5 h-5" />
                                        <span>Edit Profile</span>
                                    </CardTitle>
                                    <CardDescription>
                                        Update your personal information and account settings
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                                            <Input placeholder="Enter your email" {...field} />
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
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select your role" />
                                                                </SelectTrigger>
                                                            </FormControl>                                            <SelectContent>
                                                                <SelectItem value="user">Regular User</SelectItem>
                                                                <SelectItem value="lawyer">Lawyer</SelectItem>
                                                                <SelectItem value="barrister">Barrister</SelectItem>
                                                                <SelectItem value="government_official">Government Official</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="flex justify-between">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="flex items-center space-x-2">
                                                            <Trash2 className="w-4 h-4" />
                                                            <span>Delete Account</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete your account
                                                                and remove all your data from our servers, including all reports.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={handleDeleteAccount}
                                                                disabled={isDeleting}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                {isDeleting ? "Deleting..." : "Delete Account"}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>

                                                <Button type="submit" disabled={isLoading}>
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
            </div>
        </div>
    );
};

export default Profile;