'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
            >
                <Sun className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                    aria-label="Select theme"
                >
                    <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
                    <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100 text-sky-400" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[130px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${theme === 'light' ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 font-bold' : ''}`}
                >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>Light Mode</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${theme === 'dark' ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 font-bold' : ''}`}
                >
                    <Moon className="h-3.5 w-3.5 text-sky-400" />
                    <span>Dark Mode</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className={`flex items-center gap-2 cursor-pointer text-xs font-medium ${theme === 'system' ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 font-bold' : ''}`}
                >
                    <Monitor className="h-3.5 w-3.5 text-slate-500" />
                    <span>System Theme</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ThemeToggle;
