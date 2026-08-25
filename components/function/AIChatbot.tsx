'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, MessageSquare, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Pure React message renderer (eliminates dangerouslySetInnerHTML and DOM text reinterpretation XSS)
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');

    return (
        <div className="text-sm space-y-1.5">
            {lines.map((line, lineIdx) => {
                if (!line.trim()) {
                    return <div key={lineIdx} className="h-1.5" />;
                }

                // Tokenize **bold** and *italic* safely into React components
                const tokens = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

                return (
                    <p key={lineIdx} className="leading-relaxed">
                        {tokens.map((token, tokenIdx) => {
                            if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
                                return (
                                    <strong key={tokenIdx} className="font-semibold text-inherit">
                                        {token.slice(2, -2)}
                                    </strong>
                                );
                            }
                            if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
                                return (
                                    <em key={tokenIdx} className="italic text-inherit">
                                        {token.slice(1, -1)}
                                    </em>
                                );
                            }
                            return <span key={tokenIdx}>{token}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

const AIChatbot = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { session, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const checkAuth = async () => {
            if (authLoading) return;

            if (!session) {
                router.push('/auth');
                return;
            }

            try {
                if (!session.user?.vkyc_completed) {
                    router.push('/vkyc');
                    return;
                }

                // Initial welcome message
                setMessages([{
                    id: '1',
                    role: 'assistant',
                    content: 'Welcome to the **Legal AI Assistant**! I\'m here to help you with legal questions, statutory interpretations, documentation review, and procedural guidance. How can I assist you today?',
                    timestamp: new Date()
                }]);
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/auth');
            }
        };

        checkAuth();
    }, [session, authLoading, router]);

    const handleApiKeySubmit = () => {
        if (!apiKey.trim()) {
            toast({
                title: "API Key Required",
                description: "Please enter your Gemini API key to continue.",
                variant: "destructive",
            });
            return;
        }

        // Store custom key in in-memory component state
        setShowApiKeyInput(false);

        toast({
            title: "API Key Configured",
            description: "Custom Gemini API key configured for this session.",
        });
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const currentInput = inputMessage.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: currentInput,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: currentInput,
                    customApiKey: apiKey || undefined
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.requiresApiKey) {
                    setShowApiKeyInput(true);
                }
                throw new Error(data.error || 'Failed to get response from AI');
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('AI chat error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to process AI response",
                variant: "destructive",
            });

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please ensure an API key is configured on the server or enter a custom key.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Chat cleared! How can I help you with your **legal questions**?',
            timestamp: new Date()
        }]);
    };

    const resetApiKey = () => {
        setApiKey('');
        setShowApiKeyInput(true);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900">
            <Navbar />
            <div className="pt-12 sm:pt-20 px-2 sm:px-4 py-6 sm:py-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-12rem)] flex flex-col shadow-xl">
                        <CardHeader className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center space-x-2">
                                <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-2 rounded-lg text-white flex items-center justify-center shadow-md">
                                    <Scale className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="flex items-center space-x-1 text-base">
                                        <MessageSquare className="w-4 h-4 text-sky-600" />
                                        <span>Justiceia Legal AI Assistant</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Powered by Google Gemini 1.5 Flash
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-row space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <Button variant="outline" size="sm" onClick={clearChat}>
                                    Clear Chat
                                </Button>
                                <Button variant="outline" size="sm" onClick={resetApiKey}>
                                    {apiKey ? 'Change Key' : 'Set Custom Key'}
                                </Button>
                            </div>
                        </CardHeader>

                        {showApiKeyInput ? (
                            <CardContent className="flex flex-col items-center justify-center h-full space-y-4 p-6">
                                <div className="text-center space-y-2">
                                    <Bot className="w-16 h-16 mx-auto text-sky-500" />
                                    <h3 className="text-lg font-semibold">Custom API Key Setup</h3>
                                    <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm">
                                        Enter your Google Gemini API key if not configured in the server environment. Key is stored securely in memory for this session only.
                                    </p>
                                </div>
                                <div className="w-full max-w-md space-y-3">
                                    <Input
                                        type="password"
                                        placeholder="Enter your Gemini API key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                                    />
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setShowApiKeyInput(false)} className="flex-1">
                                            Cancel
                                        </Button>
                                        <Button onClick={handleApiKeySubmit} className="flex-1 bg-sky-600 hover:bg-sky-700">
                                            Apply Key
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500 text-center">
                                        Get your free API key from{' '}
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
                                            Google AI Studio
                                        </a>
                                    </p>
                                </div>
                            </CardContent>
                        ) : (
                            <>
                                <CardContent className="flex-1 p-0 overflow-hidden">
                                    <ScrollArea className="h-full px-3 sm:px-6" ref={chatContainerRef}>
                                        <div className="space-y-4 py-4">
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`flex max-w-[95%] sm:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                                            } items-start space-x-2`}
                                                    >
                                                        <div
                                                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${message.role === 'user'
                                                                ? 'bg-sky-600 text-white ml-2'
                                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 mr-2'
                                                                }`}
                                                        >
                                                            {message.role === 'user' ? (
                                                                <User className="w-4 h-4" />
                                                            ) : (
                                                                <Bot className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div
                                                            className={`rounded-2xl px-4 py-3 shadow-sm ${message.role === 'user'
                                                                ? 'bg-sky-600 text-white'
                                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                                                }`}
                                                            style={{ wordBreak: 'break-word' }}
                                                        >
                                                            <MessageContent content={message.content} />
                                                            <span className="text-[10px] opacity-60 mt-1.5 block text-right">
                                                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {isLoading && (
                                                <div className="flex justify-start">
                                                    <div className="flex items-start space-x-2 max-w-[80%]">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 flex items-center justify-center mr-2">
                                                            <Bot className="w-4 h-4" />
                                                        </div>
                                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                                                            <div className="flex space-x-1.5 items-center">
                                                                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"></div>
                                                                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                                                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </ScrollArea>
                                </CardContent>

                                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl">
                                    <div className="flex space-x-2">
                                        <Input
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder="Ask any legal question (e.g., Section 138 NI Act, Tenant Rights, Bail procedure)..."
                                            disabled={isLoading}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={sendMessage}
                                            disabled={isLoading || !inputMessage.trim()}
                                            className="px-4 bg-sky-600 hover:bg-sky-700 text-white"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                                        This AI provides general legal information and should not replace tailored professional legal advice.
                                    </p>
                                </div>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AIChatbot;