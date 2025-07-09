'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, MessageSquare, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Function to parse markdown-style formatting
const parseMarkdown = (text: string) => {
    // Replace bold text (**text** or ****text****)
    return text
        .replace(/\*\*\*\*(.*?)\*\*\*\*/g, '<strong>$1</strong>') // ****text****
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **text**
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // *text* for italics
        .replace(/\n/g, '<br>'); // Line breaks
};

// Component to render formatted message content
const MessageContent = ({ content }: { content: string }) => {
    const formattedContent = parseMarkdown(content);

    return (
        <div
            className="text-sm"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
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
    const [showApiKeyInput, setShowApiKeyInput] = useState(true);
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
                // Check VKYC completion
                const response = await fetch(`/api/profile/${session.user.id}`);
                if (response.ok) {
                    const profile = await response.json();

                    if (!profile?.vkyc_completed) {
                        router.push('/vkyc');
                        return;
                    }
                } else {
                    router.push('/auth');
                    return;
                }

                // Check if API key is stored in localStorage
                const storedApiKey = localStorage.getItem('gemini_api_key');
                if (storedApiKey) {
                    setApiKey(storedApiKey);
                    setShowApiKeyInput(false);

                    // Add welcome message
                    setMessages([{
                        id: '1',
                        role: 'assistant',
                        content: 'Welcome to the **Legal AI Assistant**! I\'m here to help you with legal questions, document review, legal research, and general legal guidance. How can I assist you today?',
                        timestamp: new Date()
                    }]);
                }
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

        localStorage.setItem('gemini_api_key', apiKey);
        setShowApiKeyInput(false);

        setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Welcome to the **Legal AI Assistant**! I\'m here to help you with legal questions, document review, legal research, and general legal guidance. How can I assist you today?',
            timestamp: new Date()
        }]);

        toast({
            title: "API Key Saved",
            description: "You can now start chatting with the legal AI assistant!",
        });
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const legalContext = `You are a knowledgeable legal AI assistant specializing in Indian law and general legal principles. 
      You provide helpful, accurate, and professional legal guidance while always reminding users that your advice does not constitute formal legal counsel and they should consult with a qualified lawyer for specific legal matters.
      
      Focus on:
      - Indian legal system and laws
      - Legal procedures and documentation
      - Rights and obligations
      - Legal terminology explanations
      - General legal guidance
      
      Always maintain a professional, helpful tone and provide practical insights while emphasizing the importance of professional legal consultation for specific cases.
      
      Format your responses using markdown when appropriate:
      - Use **text** for important points or headings
      - Use *text* for emphasis
      - Use line breaks for better readability
      
      User question: ${inputMessage}`;
            const result = await model.generateContent(legalContext);
            const response = result.response;
            const text = response.text();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: text,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            toast({
                title: "Error",
                description: "Failed to get response from AI. Please check your API key and try again.",
                variant: "destructive",
            });

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please check your API key and try again.',
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
        localStorage.removeItem('gemini_api_key');
        setApiKey('');
        setShowApiKeyInput(true);
        setMessages([]);
    };

    // Show loading while checking authentication
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    // Don't render if no session
    if (!session) {
        return null;
    }

    // ...existing code...

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="pt-12 sm:pt-20 px-2 sm:px-4 py-6 sm:py-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-12rem)] flex flex-col">
                        <CardHeader className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 py-4 sm:py-4">
                            <div className="flex flex-wrap gap-1 sm:flex-nowrap sm:space-x-1">
                                <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-1 rounded-lg  w-7 h-7 flex items-center justify-center">
                                    <Scale className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="flex items-center space-x-1 text-base">
                                        <MessageSquare className="w-4 h-4" />
                                        <span>Legal AI Assistant</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Get instant legal guidance powered by AI
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-row space-x-1 w-full sm:w-auto mt-2 sm:mt-0">
                                <Button variant="outline" size="sm" className="truncate min-w-0 flex-1 py-4 h-7" onClick={clearChat}>
                                    Clear Chat
                                </Button>
                                <Button variant="outline" size="sm" className="truncate min-w-0 flex-1 py-4 h-7" onClick={resetApiKey}>
                                    Reset API Key
                                </Button>
                            </div>
                        </CardHeader>

                        {showApiKeyInput ? (
                            <CardContent className="flex flex-col items-center justify-center h-full space-y-4">
                                <div className="text-center space-y-2">
                                    <Bot className="w-16 h-16 mx-auto text-slate-400" />
                                    <h3 className="text-lg font-semibold">Setup Required</h3>
                                    <p className="text-slate-600 max-w-md">
                                        To use the AI legal assistant, please enter your Google Gemini API key.
                                        Your key will be stored locally and never shared.
                                    </p>
                                </div>
                                <div className="w-full max-w-md space-y-3">
                                    <Input
                                        type="password"
                                        placeholder="Enter your Gemini API key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                                        onKeyPress={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                                    />
                                    <Button onClick={handleApiKeySubmit} className="w-full">
                                        Save API Key & Start Chatting
                                    </Button>
                                    <p className="text-xs text-slate-500 text-center">
                                        Get your free API key from{' '}
                                        <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
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
                                                        className={`flex max-w-[98%] xs:max-w-[90%] sm:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                                            } items-start space-x-2`}
                                                    >
                                                        <div
                                                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                                                                ? 'bg-sky-500 text-white ml-2'
                                                                : 'bg-slate-100 text-slate-600 mr-2'
                                                                }`}
                                                        >
                                                            {message.role === 'user' ? (
                                                                <User className="w-4 h-4" />
                                                            ) : (
                                                                <Bot className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div
                                                            className={`rounded-lg px-4 py-2 break-words ${message.role === 'user'
                                                                ? 'bg-sky-500 text-white'
                                                                : 'bg-white border border-slate-200 text-slate-800'
                                                                }`}
                                                            style={{ wordBreak: 'break-word' }}
                                                        >
                                                            <MessageContent content={message.content} />
                                                            <span className="text-xs opacity-70 mt-1 block">
                                                                {message.timestamp.toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {isLoading && (
                                                <div className="flex justify-start">
                                                    <div className="flex items-start space-x-2 max-w-[98%] xs:max-w-[90%] sm:max-w-[80%]">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mr-2">
                                                            <Bot className="w-4 h-4" />
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
                                                            <div className="flex space-x-1">
                                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </ScrollArea>
                                </CardContent>

                                <div className="p-2 xs:p-3 sm:p-6 border-t border-slate-200">
                                    <div className="flex flex-row sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                        <Input
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Ask me anything about legal matters..."
                                            disabled={isLoading}
                                            className="flex-1 mx-2"
                                        />
                                        <Button
                                            onClick={sendMessage}
                                            disabled={isLoading || !inputMessage.trim()}
                                            className="px-4"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        This AI provides general legal guidance. Always consult with a qualified lawyer for specific legal advice.
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