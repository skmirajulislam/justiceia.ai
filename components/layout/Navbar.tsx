"use client";

import { useState, useEffect } from 'react';
import { Search, Menu, X, Scale, User, FileText, Video, Brain, LogIn, LogOut, Settings, UserCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showVkycBlockModal, setShowVkycBlockModal] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { session, logout } = useAuth();
  const pathname = usePathname();

  const isProfessional = session?.user?.isProfessional || (session?.user?.role && ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(session.user.role));
  const isVkycPending = isProfessional && !session?.user?.vkyc_completed;

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isVkycPending && href !== '/' && href !== '/profile' && href !== '/vkyc' && href !== '/auth') {
      e.preventDefault();
      setShowVkycBlockModal(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = () => {
    if (session?.user?.first_name || session?.user?.last_name) {
      return `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim();
    }
    if (session?.user?.name) {
      return session.user.name;
    }
    return 'Profile';
  };

  const navItems = [
    { name: 'AI Chatbot', href: '/chatbot', icon: <Search className="w-4 h-4" />, requiresAuth: true },
    { name: 'Legal Library', href: '/library', icon: <FileText className="w-4 h-4" />, requiresAuth: true },
    { name: 'Video Consult', href: '/consult', icon: <Video className="w-4 h-4" />, requiresAuth: true },
    { name: 'Document Processor', href: '/document-processor', icon: <Brain className="w-4 h-4" />, requiresAuth: true },
  ];

  if (isProfessional) {
    navItems.push({
      name: 'Publish Report',
      href: '/publish-report',
      icon: <FileText className="w-4 h-4" />,
      requiresAuth: true
    });
  }

  const filteredNavItems = navItems.filter(item => !item.requiresAuth || session);

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 transition-transform duration-150 hover:scale-[1.02]">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-2 rounded-lg">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Justiceia.ai</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-16 flex items-baseline space-x-6">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`flex items-center space-x-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150
                    ${pathname === item.href
                      ? 'text-sky-600 dark:text-sky-400 font-semibold bg-sky-50/60 dark:bg-sky-950/40'
                      : 'text-slate-600 hover:text-sky-600 hover:bg-slate-100/50 dark:text-slate-300 dark:hover:text-sky-400'}
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-sm font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800">
                    <UserCircle className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    <span className="max-w-[180px] truncate">{getUserDisplayName()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 shadow-lg border-slate-200">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>

                  {isProfessional && (
                    <DropdownMenuItem asChild>
                      <Link href="/vkyc" className="flex items-center cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Video KYC Status
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="flex items-center space-x-1 text-slate-600 hover:text-sky-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/auth"
                  className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
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
        <div className="md:hidden bg-white border-t border-slate-200 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {filteredNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="items-center space-x-2 text-slate-600 hover:text-sky-500 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                onClick={(e) => {
                  handleNavClick(e, item.href);
                  setIsMenuOpen(false);
                }}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
            <div className="pt-4 pb-2 border-t border-slate-200 mt-4">
              {session ? (
                <>
                  <Link
                    href="/profile"
                    className="items-center space-x-2 w-full text-left text-slate-600 hover:text-sky-500 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile ({getUserDisplayName()})</span>
                  </Link>
                  <Link
                    href="/vkyc"
                    className="items-center space-x-2 w-full text-left text-slate-600 hover:text-sky-500 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Update KYC</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="items-center space-x-2 w-full text-left text-red-600 hover:text-red-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="items-center space-x-2 w-full text-left text-slate-600 hover:text-sky-500 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/auth"
                    className="w-full mt-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 text-center block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global VKYC Restriction Interceptor Modal */}
      <AlertDialog open={showVkycBlockModal} onOpenChange={setShowVkycBlockModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center space-x-2 text-amber-600 mb-2">
              <ShieldAlert className="w-6 h-6" />
              <AlertDialogTitle className="text-lg font-bold text-slate-900">
                Video KYC Verification Required
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600 space-y-2">
              <p>
                As an advocate on Justiceia.ai, your profile updates require completing Video KYC before you can access consultation and document tools.
              </p>
              <p className="font-semibold text-slate-800">
                Please complete your Video KYC verification to unlock full platform access.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowVkycBlockModal(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowVkycBlockModal(false);
                router.push('/vkyc');
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
            >
              Complete Video KYC Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};

export default Navbar;