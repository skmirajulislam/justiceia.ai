'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, User, Scale } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const AIChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI legal assistant. How can I help you with your legal queries today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I understand your legal query. Based on Indian legal framework, I recommend consulting with a qualified advocate for personalized advice. Would you like me to help you find relevant case laws or connect you with our expert lawyers?',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 my-17">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Bot className="w-7 h-8 text-sky-500 " />
              <h1 className="text-3xl  font-bold text-slate-900">AI Legal Assistant</h1>
            </div>
            <p className="text-slate-600">Ask legal questions and get instant AI-powered guidance</p>
          </div>

          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 mx-2.5">
                <Scale className="w-5 h-5 text-black" />
                <span className='text-black'>Legal Chat</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${message.sender === 'user'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 text-slate-900'
                        }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.sender === 'bot' && <Bot className="w-4 h-4 mt-1 flex-shrink-0" />}
                        {message.sender === 'user' && <User className="w-4 h-4 mt-1 flex-shrink-0" />}
                        <div>
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-sky-100' : 'text-slate-500'
                            }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your legal question..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
