'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Video, Clock, Star, MapPin, Phone, MessageCircle,
    Mic, MicOff, Camera, CameraOff, Plus,
    X, Send, User, Briefcase, DollarSign, AlertCircle,
    Edit, Trash2
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import io, { Socket } from 'socket.io-client';
import FakePaymentForm from '@/components/function/FakePaymentForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Advocate Profile Form Schema
const advocateProfileSchema = z.object({
    specialization: z.string().min(1, "Specialization is required"),
    experience: z.number().min(0, "Experience must be 0 or greater"),
    bio: z.string().min(10, "Bio must be at least 10 characters"),
    education: z.string().min(1, "Education is required"),
    certifications: z.string().min(1, "Certifications are required"),
    hourly_rate: z.number().min(100, "Hourly rate must be at least ₹100"),
    languages: z.string().min(1, "Languages are required"),
});

type AdvocateProfileFormData = z.infer<typeof advocateProfileSchema>;

interface Lawyer {
    id: string;
    name: string;
    specialization: string;
    experience: number;
    rating: number;
    location: string;
    rate: number;
    available: boolean;
    image: string;
    languages: string[];
    bio?: string;
    education?: string;
    certifications?: string[];
}

interface ConsultationRequest {
    id: string;
    clientId: string;
    clientName: string;
    advocateId: string;
    advocateName: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    requestDate: string;
    message: string;
    consultationType: 'video' | 'chat';
    amount: number;
    paymentStatus: 'pending' | 'paid' | 'failed';
}

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}

interface VideoCallState {
    isInCall: boolean;
    callId: string | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    peerConnection: RTCPeerConnection | null;
    callStatus: 'idle' | 'calling' | 'ringing' | 'ongoing' | 'ended';
    callerInfo: {
        id: string;
        name: string;
    } | null;
}

interface IncomingCall {
    callId: string;
    from: string;
    fromName: string;
    offer: RTCSessionDescriptionInit;
}


interface AdvocateProfile {
    id: string;
    user_id: string;
    specialization: string[];
    experience: number;
    bio: string;
    education: string;
    certifications: string[];
    hourly_rate: number;
    location: string;
    languages: string[];
    image_url: string;
    is_verified: boolean;
    is_available: boolean;
    rating: number;
    total_consultations: number;
    profile?: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    name?: string;
    email?: string;
    phone?: string;
    rate?: number;
    image?: string;
}

// Context Types
interface SocketContextType {
    socket: Socket | null;
    onlineUsers: Set<string>;
}

interface VideoCallContextType {
    videoCall: VideoCallState;
    startCall: (participantId: string, participantName: string) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    incomingCall: IncomingCall | null;
    acceptCall: () => void;
    rejectCall: () => void;
}

// Create Contexts
const SocketContext = createContext<SocketContextType>({
    socket: null,
    onlineUsers: new Set()
});

const VideoCallContext = createContext<VideoCallContextType>({
    videoCall: {
        isInCall: false,
        callId: null,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        peerConnection: null,
        callStatus: 'idle',
        callerInfo: null
    },
    startCall: () => { },
    endCall: () => { },
    toggleMute: () => { },
    toggleVideo: () => { },
    incomingCall: null,
    acceptCall: () => { },
    rejectCall: () => { }
});

// Context Providers
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user?.id) return;

        const newSocket = io('/', {
            path: '/api/socket',
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // Register user
        newSocket.emit('register-user', session.user.id);

        // Handle online users
        newSocket.on('online-users', (onlineUserIds: string[]) => {
            setOnlineUsers(new Set(onlineUserIds));
        });

        // Handle individual status changes
        newSocket.on('user-status-changed', (data: { userId: string, isOnline: boolean }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                if (data.isOnline) {
                    newSet.add(data.userId);
                } else {
                    newSet.delete(data.userId);
                }
                return newSet;
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [session?.user?.id]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { socket } = useSocket();
    const { toast } = useToast();

    const [videoCall, setVideoCall] = useState<VideoCallState>({
        isInCall: false,
        callId: null,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        peerConnection: null,
        callStatus: 'idle',
        callerInfo: null
    });

    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

    const initializePeerConnection = () => {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ]
        };

        const pc = new RTCPeerConnection(configuration);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && videoCall.callerInfo) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetId: videoCall.callerInfo.id,
                    callId: videoCall.callId
                });
            }
        };

        pc.ontrack = (event) => {
            setVideoCall(prev => ({
                ...prev,
                remoteStream: event.streams[0],
                callStatus: 'ongoing'
            }));
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' ||
                pc.connectionState === 'failed') {
                endCall();
            }
        };

        return pc;
    };

    const startCall = async (participantId: string, participantName: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            const callId = `call_${Date.now()}`;
            const peerConnection = initializePeerConnection();

            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            setVideoCall({
                isInCall: true,
                callId,
                localStream: stream,
                remoteStream: null,
                isMuted: false,
                isVideoOff: false,
                peerConnection,
                callStatus: 'calling',
                callerInfo: {
                    id: participantId,
                    name: participantName
                }
            });

            if (socket) {
                socket.emit('start-video-call', {
                    callId,
                    participantId,
                    participantName,
                    offer,
                    callerId: socket.id,
                    callerName: 'User'
                });
            }

        } catch (error) {
            console.error('Error starting call:', error);
            toast({
                title: "Error",
                description: "Failed to start call. Please check permissions.",
                variant: "destructive",
            });
        }
    };

    const endCall = () => {
        if (videoCall.localStream) {
            videoCall.localStream.getTracks().forEach(track => track.stop());
        }
        if (videoCall.peerConnection) {
            videoCall.peerConnection.close();
        }

        if (socket && videoCall.callId && videoCall.callerInfo) {
            socket.emit('end-call', {
                callId: videoCall.callId,
                targetId: videoCall.callerInfo.id
            });
        }

        setVideoCall({
            isInCall: false,
            callId: null,
            localStream: null,
            remoteStream: null,
            isMuted: false,
            isVideoOff: false,
            peerConnection: null,
            callStatus: 'idle',
            callerInfo: null
        });
    };

    const toggleMute = () => {
        if (videoCall.localStream) {
            const audioTrack = videoCall.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setVideoCall(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
            }
        }
    };

    const toggleVideo = () => {
        if (videoCall.localStream) {
            const videoTrack = videoCall.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoCall(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
            }
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            const peerConnection = initializePeerConnection();

            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(incomingCall.offer)
            );

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            setVideoCall({
                isInCall: true,
                callId: incomingCall.callId,
                localStream: stream,
                remoteStream: null,
                isMuted: false,
                isVideoOff: false,
                peerConnection,
                callStatus: 'ongoing',
                callerInfo: {
                    id: incomingCall.from,
                    name: incomingCall.fromName
                }
            });

            if (socket) {
                socket.emit('call-accepted', {
                    callId: incomingCall.callId,
                    answer,
                    targetId: incomingCall.from
                });
            }

            setIncomingCall(null);
        } catch (error) {
            console.error('Error accepting call:', error);
            toast({
                title: "Error",
                description: "Failed to accept call.",
                variant: "destructive",
            });
        }
    };

    const rejectCall = () => {
        if (socket && incomingCall) {
            socket.emit('call-rejected', {
                callId: incomingCall.callId,
                targetId: incomingCall.from
            });
        }
        setIncomingCall(null);
    };

    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data: {
            callId: string;
            from: string;
            fromName: string;
            offer: RTCSessionDescriptionInit;
        }) => {
            setIncomingCall({
                callId: data.callId,
                from: data.from,
                fromName: data.fromName,
                offer: data.offer
            });
        };

        const handleIceCandidate = (data: {
            candidate: RTCIceCandidate;
            callId: string;
        }) => {
            if (videoCall.callId === data.callId && videoCall.peerConnection) {
                videoCall.peerConnection.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                ).catch(console.error);
            }
        };

        const handleCallAnswer = (data: {
            answer: RTCSessionDescriptionInit;
            callId: string;
        }) => {
            if (videoCall.callId === data.callId && videoCall.peerConnection) {
                videoCall.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                ).catch(console.error);
            }
        };

        const handleCallEnded = () => {
            endCall();
            toast({
                title: "Call Ended",
                description: "The other participant has ended the call.",
            });
        };

        socket.on('video-call-incoming', handleIncomingCall);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('call-answer', handleCallAnswer);
        socket.on('call-ended', handleCallEnded);

        return () => {
            socket.off('video-call-incoming', handleIncomingCall);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('call-answer', handleCallAnswer);
            socket.off('call-ended', handleCallEnded);
        };
    }, [socket, videoCall.callId, videoCall.peerConnection]);

    return (
        <VideoCallContext.Provider value={{
            videoCall,
            startCall,
            endCall,
            toggleMute,
            toggleVideo,
            incomingCall,
            acceptCall,
            rejectCall
        }}>
            {children}
        </VideoCallContext.Provider>
    );
};

// Custom Hooks
export const useSocket = () => useContext(SocketContext);
export const useVideoCall = () => useContext(VideoCallContext);

// Video Call Modal Component
interface VideoCallModalProps {
    videoCall: VideoCallState;
    onEndCall: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
    videoCall,
    onEndCall,
    onToggleMute,
    onToggleVideo
}) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && videoCall.localStream) {
            localVideoRef.current.srcObject = videoCall.localStream;
        }
        return () => {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
        };
    }, [videoCall.localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && videoCall.remoteStream) {
            remoteVideoRef.current.srcObject = videoCall.remoteStream;
        }
        return () => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        };
    }, [videoCall.remoteStream]);

    if (!videoCall.isInCall) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        {videoCall.callStatus === 'calling' ? 'Calling...' :
                            videoCall.callStatus === 'ringing' ? 'Incoming Call' :
                                `Video Call with ${videoCall.callerInfo?.name || 'Participant'}`}
                    </h2>
                    <Button variant="destructive" onClick={onEndCall}>
                        End Call
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Remote Video */}
                    <div className="relative bg-slate-100 rounded-lg overflow-hidden aspect-video">
                        {videoCall.remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <User className="w-12 h-12 mx-auto text-slate-400" />
                                    <p className="text-slate-500 mt-2">
                                        {videoCall.callStatus === 'calling' ? 'Waiting for answer...' :
                                            videoCall.callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                            {videoCall.callerInfo?.name || 'Participant'}
                        </div>
                    </div>

                    {/* Local Video */}
                    <div className="relative bg-slate-100 rounded-lg overflow-hidden aspect-video">
                        {videoCall.localStream ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <User className="w-12 h-12 text-slate-400" />
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                            You
                        </div>
                    </div>
                </div>

                <div className="flex justify-center space-x-4">
                    <Button
                        variant={videoCall.isMuted ? "destructive" : "secondary"}
                        size="lg"
                        onClick={onToggleMute}
                    >
                        {videoCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <Button
                        variant={videoCall.isVideoOff ? "destructive" : "secondary"}
                        size="lg"
                        onClick={onToggleVideo}
                    >
                        {videoCall.isVideoOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </Button>
                    <Button variant="destructive" size="lg" onClick={onEndCall}>
                        <Phone className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Incoming Call Dialog Component
const IncomingCallDialog: React.FC<{
    incomingCall: IncomingCall | null;
    onAccept: () => void;
    onReject: () => void;
}> = ({ incomingCall, onAccept, onReject }) => {
    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-sm mx-4">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center space-x-2">
                        <Phone className="w-6 h-6 text-green-500" />
                        <span>Incoming Video Call</span>
                    </CardTitle>
                    <CardDescription>
                        {incomingCall.fromName} is calling you
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex space-x-4">
                    <Button
                        onClick={onAccept}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                        <Phone className="w-4 h-4 mr-2" />
                        Accept
                    </Button>
                    <Button
                        onClick={onReject}
                        variant="destructive"
                        className="flex-1"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

// Chat Modal Component
const ChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    newMessage: string;
    setNewMessage: (message: string) => void;
    onSendMessage: () => void;
    participantName: string;
    onTyping?: (isTyping: boolean) => void;
    isParticipantTyping?: boolean;
}> = ({
    isOpen,
    onClose,
    messages,
    newMessage,
    setNewMessage,
    onSendMessage,
    participantName,
    onTyping,
    isParticipantTyping = false
}) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg w-full max-w-md mx-4 h-96 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="text-lg font-medium">Chat with {participantName}</h3>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {messages.map((message) => (
                            <div key={message.id} className="flex flex-col">
                                <div className="text-xs text-slate-500 mb-1">
                                    {message.senderName} • {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                                <div className="bg-slate-100 rounded-lg p-2 text-sm">
                                    {message.message}
                                    {message.isRead && (
                                        <div className="text-xs text-slate-400 mt-1">✓ Seen</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isParticipantTyping && (
                            <div className="flex flex-col">
                                <div className="text-xs text-slate-500 mb-1">{participantName}</div>
                                <div className="bg-slate-200 rounded-lg p-2 text-sm italic text-slate-600">
                                    typing...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t">
                        <div className="flex space-x-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    if (onTyping) {
                                        onTyping(e.target.value.length > 0);
                                    }
                                }}
                                placeholder="Type a message..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        onSendMessage();
                                        if (onTyping) onTyping(false);
                                    }
                                }}
                                onBlur={() => {
                                    if (onTyping) onTyping(false);
                                }}
                            />
                            <Button onClick={() => {
                                onSendMessage();
                                if (onTyping) onTyping(false);
                            }}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

// Main VideoConsult Component
const VideoConsult = () => {
    const { session, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { socket } = useSocket();
    const {
        videoCall,
        startCall: startVideoCall,
        endCall,
        toggleMute,
        toggleVideo,
        incomingCall,
        acceptCall,
        rejectCall
    } = useVideoCall();

    const userRole = session?.user?.role;
    const isAdvocate = userRole && ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(userRole);
    const isRegularUser = userRole === 'REGULAR_USER';

    // States
    const [selectedSpecialization, setSelectedSpecialization] = useState('all');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [advocates, setAdvocates] = useState<Lawyer[]>([]);
    const [userOnlineStatus, setUserOnlineStatus] = useState<{ [key: string]: boolean }>({});

    // Form for advocate profile
    const advocateForm = useForm<AdvocateProfileFormData>({
        resolver: zodResolver(advocateProfileSchema),
        defaultValues: {
            specialization: '',
            experience: 0,
            bio: '',
            education: '',
            certifications: '',
            hourly_rate: 1000,
            languages: '',
        },
    });

    // Payment states
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentData, setPaymentData] = useState<{
        sessionId: string;
        amount: number;
        advocateName: string;
        description: string;
        requestId: string;
    } | null>(null);

    // Advocate specific states
    const [advocateProfile, setAdvocateProfile] = useState<AdvocateProfile | null>(null);
    const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>([]);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Client specific states
    const [clientRequests, setClientRequests] = useState<ConsultationRequest[]>([]);

    // Chat states
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>({});

    const specializations = ['all', 'Corporate Law', 'Criminal Law', 'Family Law', 'Constitutional Law', 'Civil Law'];

    // Fetch data
    useEffect(() => {
        const fetchAllData = async () => {
            if (!authLoading && session) {
                await fetchAdvocates();
                await fetchUserRequests();
                if (isAdvocate) {
                    await fetchAdvocateProfile();
                }
            }
        };

        fetchAllData();
    }, [session, authLoading, isAdvocate]);

    const fetchAdvocates = async () => {
        try {
            const response = await fetch('/api/advocates', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setAdvocates(data.advocates || []);
                if (socket) {
                    socket.emit('get-online-users');
                }
            }
        } catch (error) {
            console.error('Error fetching advocates:', error);
        }
    };

    const fetchAdvocateProfile = async () => {
        try {
            const response = await fetch('/api/advocate/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setAdvocateProfile(data.profile);
            }
        } catch (error) {
            console.error('Error fetching advocate profile:', error);
        }
    };

    const fetchUserRequests = async () => {
        try {
            const response = await fetch('/api/consultation/requests', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (isAdvocate) {
                    setConsultationRequests(data.requests || []);
                } else {
                    setClientRequests(data.requests || []);
                }
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    // Socket effects
    useEffect(() => {
        if (!session) return;

        const handleOnlineUsers = (onlineUserIds: string[]) => {
            const statusMap: { [key: string]: boolean } = {};
            onlineUserIds.forEach(userId => {
                statusMap[userId] = true;
            });
            setUserOnlineStatus(prev => ({ ...prev, ...statusMap }));
        };

        const handleConsultationRequest = (request: ConsultationRequest) => {
            if (isAdvocate) {
                setConsultationRequests(prev => [...prev, request]);
                toast({
                    title: "New Consultation Request",
                    description: `${request.clientName} has requested a consultation.`,
                });
            }
        };

        const handleRequestApproved = (request: ConsultationRequest) => {
            if (!isAdvocate) {
                setClientRequests(prev => prev.map(r => r.id === request.id ? request : r));
                toast({
                    title: "Request Approved",
                    description: `Your consultation with ${request.advocateName} has been approved.`,
                });
            }
        };

        const handleChatMessage = (message: ChatMessage) => {
            setChatMessages(prev => [...prev, message]);
            if (activeChat === message.senderId) {
                socket?.emit('message-seen', message.id);
            }
        };

        const handleUserTyping = (data: { userId: string, isTyping: boolean }) => {
            setTypingUsers(prev => ({ ...prev, [data.userId]: data.isTyping }));
        };

        const handleUserOnline = (data: { userId: string, isOnline: boolean }) => {
            setUserOnlineStatus(prev => ({ ...prev, [data.userId]: data.isOnline }));
        };

        if (socket) {
            socket.on('online-users-list', handleOnlineUsers);
            socket.on('consultation-request', handleConsultationRequest);
            socket.on('request-approved', handleRequestApproved);
            socket.on('chat-message', handleChatMessage);
            socket.on('user-typing', handleUserTyping);
            socket.on('user-online', handleUserOnline);
        }

        return () => {
            if (socket) {
                socket.off('online-users-list', handleOnlineUsers);
                socket.off('consultation-request', handleConsultationRequest);
                socket.off('request-approved', handleRequestApproved);
                socket.off('chat-message', handleChatMessage);
                socket.off('user-typing', handleUserTyping);
                socket.off('user-online', handleUserOnline);
            }
        };
    }, [socket, isAdvocate, activeChat, toast]);

    const filteredAdvocates = advocates.filter((advocate: Lawyer) =>
        selectedSpecialization === 'all' || advocate.specialization === selectedSpecialization
    );

    // Call handler functions
    const handleBookConsultation = async (lawyer: Lawyer) => {
        try {
            setLoading(true);
            const response = await fetch('/api/consultation/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    advocateId: lawyer.id,
                    consultationType: 'video',
                    message: `Requesting consultation with ${lawyer.name} for ${lawyer.specialization}`
                }),
            });

            if (response.ok) {
                toast({
                    title: "Request Sent",
                    description: `Your consultation request has been sent to ${lawyer.name}. You will be notified once approved.`,
                });
            } else {
                throw new Error('Failed to send request');
            }
        } catch (error) {
            console.error('Consultation request error:', error);
            toast({
                title: "Error",
                description: "Failed to send consultation request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (requestId: string) => {
        try {
            setLoading(true);
            const paymentResponse = await fetch('/api/payment/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    request_id: requestId,
                }),
            });

            if (paymentResponse.ok) {
                const payment = await paymentResponse.json();
                setPaymentData({
                    sessionId: payment.session_id,
                    amount: payment.amount,
                    advocateName: payment.advocate_name,
                    description: payment.description,
                    requestId: requestId
                });
                setShowPaymentForm(true);
            } else {
                const error = await paymentResponse.json();
                toast({
                    title: "Payment Error",
                    description: error.error || "Failed to initialize payment",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Payment error:', error);
            toast({
                title: "Payment Failed",
                description: "Payment processing failed. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (transactionId: string) => {
        setShowPaymentForm(false);
        setPaymentData(null);
        toast({
            title: "Payment Successful! 🎉",
            description: `Payment completed successfully. Transaction ID: ${transactionId}`,
        });
        setClientRequests(prev => prev.map(r =>
            r.id === paymentData?.requestId
                ? { ...r, paymentStatus: 'paid' as const }
                : r
        ));
    };

    const handlePaymentCancel = () => {
        setShowPaymentForm(false);
        setPaymentData(null);
        toast({
            title: "Payment Cancelled",
            description: "Payment was cancelled by user",
        });
    };

    const handleApproveRequest = async (requestId: string) => {
        try {
            const response = await fetch(`/api/consultation/approve/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setConsultationRequests(prev =>
                    prev.map(req =>
                        req.id === requestId ? { ...req, status: 'approved' } : req
                    )
                );
                toast({
                    title: "Request Approved",
                    description: "Consultation request has been approved.",
                });
            }
        } catch (error) {
            console.error('Approve request error:', error);
            toast({
                title: "Error",
                description: "Failed to approve request.",
                variant: "destructive",
            });
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const response = await fetch(`/api/consultation/reject/${requestId}`, {
                method: 'PUT',
            });

            if (response.ok) {
                setConsultationRequests(prev =>
                    prev.map(req =>
                        req.id === requestId ? { ...req, status: 'rejected' } : req
                    )
                );
                toast({
                    title: "Request Rejected",
                    description: "Consultation request has been rejected.",
                });
            }
        } catch (error) {
            console.error('Reject request error:', error);
        }
    };

    const handleStartCall = async (participantId: string, participantName: string) => {
        try {
            let hasPaidConsultation = false;
            if (isAdvocate) {
                hasPaidConsultation = consultationRequests.some(
                    req => req.clientId === participantId && req.paymentStatus === 'paid'
                );
            } else {
                hasPaidConsultation = clientRequests.some(
                    req => req.advocateId === participantId && req.paymentStatus === 'paid'
                );
            }

            if (!hasPaidConsultation) {
                toast({
                    title: "Payment Required",
                    description: "Please complete payment before starting a video call.",
                    variant: "destructive",
                });
                return;
            }

            const isParticipantOnline = userOnlineStatus[participantId];
            if (!isParticipantOnline) {
                toast({
                    title: "User Offline",
                    description: `${participantName} is currently offline. They will be notified of your call attempt.`,
                });

                if (socket) {
                    socket.emit('call-attempt-notification', {
                        targetUserId: participantId,
                        callerName: session?.user?.name || 'Someone',
                        callerId: session?.user?.id
                    });
                }
                return;
            }

            startVideoCall(participantId, participantName);
        } catch (error) {
            console.error('Video call error:', error);
            toast({
                title: "Error",
                description: "Failed to start video call. Please check your camera and microphone permissions.",
                variant: "destructive",
            });
        }
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && activeChat && socket) {
            const message: ChatMessage = {
                id: `msg_${Date.now()}`,
                senderId: session?.user?.id || '',
                senderName: session?.user?.name || 'User',
                receiverId: activeChat,
                message: newMessage,
                timestamp: new Date().toISOString(),
                isRead: false
            };

            socket.emit('send-message', message);
            setChatMessages(prev => [...prev, message]);
            setNewMessage('');
        }
    };

    const handleStartChat = (participantId: string) => {
        let hasPaidConsultation = false;
        if (isAdvocate) {
            hasPaidConsultation = consultationRequests.some(
                req => req.clientId === participantId && req.paymentStatus === 'paid'
            );
        } else {
            hasPaidConsultation = clientRequests.some(
                req => req.advocateId === participantId && req.paymentStatus === 'paid'
            );
        }

        if (!hasPaidConsultation) {
            toast({
                title: "Payment Required",
                description: "Please complete payment before starting a chat.",
                variant: "destructive",
            });
            return;
        }

        setActiveChat(participantId);
        setIsChatOpen(true);
    };

    const handleCreateProfile = async (data: AdvocateProfileFormData) => {
        try {
            if (!data.specialization || !data.bio || !data.education || !data.certifications || !data.languages) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                });
                return;
            }

            const response = await fetch('/api/advocate/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...data,
                    certifications: data.certifications.split(',').map(cert => cert.trim()),
                    languages: data.languages.split(',').map(lang => lang.trim()),
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setAdvocateProfile(result.profile);
                advocateForm.reset();
                setIsProfileDialogOpen(false);
                toast({
                    title: "Profile Created",
                    description: "Your advocate profile has been created successfully.",
                });
            } else {
                const errorData = await response.json();
                console.error('🔴 Profile creation failed:', errorData);
                toast({
                    title: "Error",
                    description: errorData.error || "Failed to create profile.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Create profile error:', error);
            toast({
                title: "Error",
                description: "Failed to create profile.",
                variant: "destructive",
            });
        }
    };

    const handleTyping = (isTyping: boolean) => {
        if (socket && activeChat) {
            socket.emit('user-typing', {
                userId: session?.user?.id,
                targetUserId: activeChat,
                isTyping
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <Navbar />
            <div className="container mx-auto px-4 pt-20 pb-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <Video className="w-8 h-8 text-sky-500" />
                            <h1 className="text-3xl font-bold text-slate-900">Video Consultation</h1>
                        </div>
                        <p className="text-slate-600">Connect with expert lawyers for personalized legal advice</p>

                        {/* Role indicator */}
                        {isAdvocate && (
                            <div className="flex justify-center mt-4">
                                <Badge variant="secondary" className="flex items-center space-x-2">
                                    <Briefcase className="w-4 h-4" />
                                    <span>Advocate Dashboard</span>
                                </Badge>
                            </div>
                        )}
                        {isRegularUser && (
                            <div className="flex justify-center mt-4">
                                <Badge variant="secondary" className="flex items-center space-x-2">
                                    <User className="w-4 h-4" />
                                    <span>Client Dashboard</span>
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    {!session ? (
                        <div className="text-center py-12">
                            <p className="text-slate-600">Please log in to access video consultation services.</p>
                        </div>
                    ) : isRegularUser ? (
                        <ClientDashboard
                            lawyers={filteredAdvocates}
                            selectedSpecialization={selectedSpecialization}
                            setSelectedSpecialization={setSelectedSpecialization}
                            specializations={specializations}
                            onBookConsultation={handleBookConsultation}
                            onStartChat={handleStartChat}
                            onStartVideoCall={handleStartCall}
                            onPayment={handlePayment}
                            clientRequests={clientRequests}
                            loading={loading}
                            userOnlineStatus={userOnlineStatus}
                        />
                    ) : isAdvocate ? (
                        <AdvocateDashboard
                            profile={advocateProfile}
                            consultationRequests={consultationRequests}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            onApproveRequest={handleApproveRequest}
                            onRejectRequest={handleRejectRequest}
                            onStartChat={handleStartChat}
                            onStartVideoCall={handleStartCall}
                            onCreateProfile={handleCreateProfile}
                            isProfileDialogOpen={isProfileDialogOpen}
                            setIsProfileDialogOpen={setIsProfileDialogOpen}
                            isUpdateDialogOpen={isUpdateDialogOpen}
                            setIsUpdateDialogOpen={setIsUpdateDialogOpen}
                            isDeleteDialogOpen={isDeleteDialogOpen}
                            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                            advocateForm={advocateForm}
                            setAdvocateProfile={setAdvocateProfile}
                            toast={toast}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h3>
                            <p className="text-slate-600">Only lawyers, barristers, and government officials can access advocate features.</p>
                            <p className="text-slate-500 mt-2">Please contact support if you believe this is an error.</p>
                        </div>
                    )}

                    {/* Video Call Modal */}
                    {videoCall.isInCall && (
                        <VideoCallModal
                            videoCall={videoCall}
                            onEndCall={endCall}
                            onToggleMute={toggleMute}
                            onToggleVideo={toggleVideo}
                        />
                    )}

                    {/* Chat Modal */}
                    {isChatOpen && (
                        <ChatModal
                            isOpen={isChatOpen}
                            onClose={() => setIsChatOpen(false)}
                            messages={chatMessages}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            onSendMessage={handleSendMessage}
                            participantName={activeChat ? advocates.find(a => a.id === activeChat)?.name || 'Chat' : 'Chat'}
                            onTyping={handleTyping}
                            isParticipantTyping={typingUsers[activeChat || ''] || false}
                        />
                    )}

                    {/* Fake Payment Form Dialog */}
                    {showPaymentForm && paymentData && (
                        <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
                            <DialogContent className="max-w-md">
                                <FakePaymentForm
                                    sessionId={paymentData.sessionId}
                                    amount={paymentData.amount}
                                    advocateName={paymentData.advocateName}
                                    description={paymentData.description}
                                    onSuccess={handlePaymentSuccess}
                                    onCancel={handlePaymentCancel}
                                />
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Incoming Call Notification */}
                    {incomingCall && (
                        <IncomingCallDialog
                            incomingCall={incomingCall}
                            onAccept={acceptCall}
                            onReject={rejectCall}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Client Dashboard Component
interface ClientDashboardProps {
    lawyers: Lawyer[];
    selectedSpecialization: string;
    setSelectedSpecialization: (spec: string) => void;
    specializations: string[];
    onBookConsultation: (lawyer: Lawyer) => void;
    onStartChat: (lawyerId: string) => void;
    onStartVideoCall: (lawyerId: string, lawyerName: string) => void;
    onPayment: (requestId: string) => void;
    clientRequests: ConsultationRequest[];
    loading: boolean;
    userOnlineStatus: { [key: string]: boolean };
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({
    lawyers,
    selectedSpecialization,
    setSelectedSpecialization,
    specializations,
    onBookConsultation,
    onStartChat,
    onStartVideoCall,
    onPayment,
    clientRequests,
    loading,
    userOnlineStatus
}) => {
    return (
        <div className="space-y-8">
            {/* Filter Section */}
            <Card className="mb-8">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-700">Filter by specialization:</span>
                            <select
                                value={selectedSpecialization}
                                onChange={(e) => setSelectedSpecialization(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-md bg-white"
                            >
                                {specializations.map(spec => (
                                    <option key={spec} value={spec}>
                                        {spec === 'all' ? 'All Specializations' : spec}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Available Now</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span>Busy</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Client Requests Section */}
            {clientRequests.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Consultation Requests</CardTitle>
                        <CardDescription>Track your consultation requests and payments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {clientRequests.map((request) => (
                                <div key={request.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium">{request.advocateName}</h3>
                                            <p className="text-sm text-slate-600 mb-2">{request.message}</p>
                                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                                                <span>{request.requestDate}</span>
                                                <Badge variant={
                                                    request.status === 'approved' ? 'default' :
                                                        request.status === 'rejected' ? 'destructive' : 'secondary'
                                                }>
                                                    {request.status}
                                                </Badge>
                                                <span>₹{request.amount}</span>
                                                <Badge variant={
                                                    request.paymentStatus === 'paid' ? 'default' :
                                                        request.paymentStatus === 'failed' ? 'destructive' : 'secondary'
                                                }>
                                                    {request.paymentStatus}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {request.status === 'approved' && request.paymentStatus === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onPayment(request.id)}
                                                    disabled={loading}
                                                >
                                                    <DollarSign className="w-4 h-4 mr-2" />
                                                    Pay Now
                                                </Button>
                                            )}
                                            {request.status === 'approved' && request.paymentStatus === 'paid' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onStartChat(request.advocateId)}
                                                    >
                                                        <MessageCircle className="w-4 h-4 mr-2" />
                                                        Chat
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => onStartVideoCall(request.advocateId, request.advocateName)}
                                                    >
                                                        <Video className="w-4 h-4 mr-2" />
                                                        Video Call
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lawyers Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {lawyers.map((lawyer) => {
                    const paidConsultation = clientRequests.find(
                        req => req.advocateId === lawyer.id && req.paymentStatus === 'paid'
                    );
                    const isPaid = !!paidConsultation;

                    return (
                        <Card key={lawyer.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start space-x-4">
                                    <Image
                                        width={64}
                                        height={64}
                                        src={lawyer.image}
                                        alt={lawyer.name}
                                        className="w-16 h-16 rounded-full object-cover bg-slate-200"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <CardTitle className="text-lg">{lawyer.name}</CardTitle>
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-3 h-3 rounded-full ${userOnlineStatus[lawyer.id] ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                <span className={`text-xs font-medium ${userOnlineStatus[lawyer.id] ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {userOnlineStatus[lawyer.id] ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                        <CardDescription className="text-sm">
                                            {lawyer.specialization}
                                        </CardDescription>
                                        <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                                            <div className="flex items-center space-x-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span>{lawyer.rating}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{lawyer.experience}+ years</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <MapPin className="w-4 h-4" />
                                        <span>{lawyer.location}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {lawyer.languages.map((lang, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                                {lang}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="text-lg font-semibold text-sky-600">
                                        ₹{lawyer.rate}/hour
                                    </div>
                                    {isPaid && (
                                        <Badge className="bg-green-100 text-green-800">
                                            <DollarSign className="w-3 h-3 mr-1" />
                                            Paid Access
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        className="w-full"
                                        disabled={!isPaid}
                                        onClick={() => isPaid ? onStartVideoCall(lawyer.id, lawyer.name) : onBookConsultation(lawyer)}
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        {!isPaid ? 'Request Consultation' :
                                            userOnlineStatus[lawyer.id] ? '🟢 Start Video Call (Online)' : 'Call (Offline - Will Notify)'}
                                    </Button>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            disabled={!isPaid}
                                            onClick={() => onStartChat(lawyer.id)}
                                        >
                                            <MessageCircle className="w-4 h-4 mr-1" />
                                            Chat
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            disabled={!isPaid}
                                        >
                                            <Phone className="w-4 h-4 mr-1" />
                                            Call
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            disabled={!isPaid}
                                            onClick={() => isPaid && onStartChat(lawyer.id)}
                                        >
                                            <MessageCircle className="w-4 h-4 mr-1" />
                                            Message
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Emergency Consultation */}
            <Card className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-800">Need Urgent Legal Help?</CardTitle>
                    <CardDescription className="text-red-600">
                        Our emergency consultation service is available 24/7 for critical legal matters.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="bg-red-600 hover:bg-red-700">
                        <Phone className="w-4 h-4 mr-2" />
                        Emergency Consultation
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

// Advocate Dashboard Component
interface AdvocateDashboardProps {
    profile: AdvocateProfile | null;
    consultationRequests: ConsultationRequest[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onApproveRequest: (requestId: string) => void;
    onRejectRequest: (requestId: string) => void;
    onStartChat: (clientId: string) => void;
    onStartVideoCall: (clientId: string, clientName: string) => void;
    onCreateProfile: (data: AdvocateProfileFormData) => void;
    advocateForm: ReturnType<typeof useForm<AdvocateProfileFormData>>;
    isProfileDialogOpen: boolean;
    setIsProfileDialogOpen: (open: boolean) => void;
    isUpdateDialogOpen: boolean;
    setIsUpdateDialogOpen: (open: boolean) => void;
    isDeleteDialogOpen: boolean;
    setIsDeleteDialogOpen: (open: boolean) => void;
    setAdvocateProfile: (profile: AdvocateProfile | null) => void;
    toast: ReturnType<typeof useToast>['toast'];
}

const AdvocateDashboard: React.FC<AdvocateDashboardProps> = ({
    profile,
    consultationRequests,
    activeTab,
    setActiveTab,
    onApproveRequest,
    onRejectRequest,
    onStartChat,
    onStartVideoCall,
    onCreateProfile,
    advocateForm,
    isProfileDialogOpen,
    setIsProfileDialogOpen,
    isUpdateDialogOpen,
    setIsUpdateDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    setAdvocateProfile,
    toast
}) => {
    if (!profile) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to Advocate Dashboard</CardTitle>
                    <CardDescription>Please create your profile to start receiving consultation requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setIsProfileDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Profile
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create Advocate Profile</DialogTitle>
                            </DialogHeader>
                            <Form {...advocateForm}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        advocateForm.handleSubmit(onCreateProfile)(e);
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={advocateForm.control}
                                            name="specialization"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Specialization</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select specialization" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Corporate Law">Corporate Law</SelectItem>
                                                            <SelectItem value="Criminal Law">Criminal Law</SelectItem>
                                                            <SelectItem value="Family Law">Family Law</SelectItem>
                                                            <SelectItem value="Constitutional Law">Constitutional Law</SelectItem>
                                                            <SelectItem value="Civil Law">Civil Law</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={advocateForm.control}
                                            name="experience"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Experience (years)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={advocateForm.control}
                                        name="bio"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bio</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} placeholder="Tell us about yourself..." />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={advocateForm.control}
                                        name="education"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Education</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Your educational background" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={advocateForm.control}
                                        name="certifications"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Certifications (comma-separated)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Certification 1, Certification 2" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={advocateForm.control}
                                            name="hourly_rate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Hourly Rate (₹)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={advocateForm.control}
                                            name="languages"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Languages (comma-separated)</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Hindi, English" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={!advocateForm.formState.isValid || advocateForm.formState.isSubmitting}
                                    >
                                        {advocateForm.formState.isSubmitting ? 'Creating...' : 'Create Profile'}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Welcome,  {profile.profile ?
                            `${profile.profile.first_name || ''} ${profile.profile.last_name || ''}`.trim() || 'Not specified' :
                            profile.name || 'Not specified'
                        }</h1>
                        <p className="text-slate-600">{profile.specialization} • {profile.experience} years experience</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Badge variant="secondary">
                            <Star className="w-4 h-4 mr-1" />
                            {profile.rating}/5
                        </Badge>
                        <Badge variant="outline">
                            {profile.total_consultations || 0} consultations
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="border-b border-slate-200">
                    <div className="flex space-x-8 px-6">
                        {['dashboard', 'requests', 'profile'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'requests' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Consultation Requests</h2>
                            {consultationRequests.length === 0 ? (
                                <p className="text-slate-500">No consultation requests yet.</p>
                            ) : (
                                <div className="grid gap-4">
                                    {consultationRequests.map((request) => (
                                        <Card key={request.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="font-medium">{request.clientName}</h3>
                                                        <p className="text-sm text-slate-600 mb-2">{request.message}</p>
                                                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                                                            <span>{request.requestDate}</span>
                                                            <Badge variant={
                                                                request.status === 'approved' ? 'default' :
                                                                    request.status === 'rejected' ? 'destructive' : 'secondary'
                                                            }>
                                                                {request.status}
                                                            </Badge>
                                                            <span>₹{request.amount}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {request.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => onApproveRequest(request.id)}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => onRejectRequest(request.id)}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}
                                                        {request.status === 'approved' && request.paymentStatus === 'paid' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => onStartChat(request.clientId)}
                                                                >
                                                                    <MessageCircle className="w-4 h-4 mr-2" />
                                                                    Chat
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => onStartVideoCall(request.clientId, request.clientName)}
                                                                >
                                                                    <Video className="w-4 h-4 mr-2" />
                                                                    Video Call
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{consultationRequests.length}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {consultationRequests.filter(r => r.status === 'pending').length}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {consultationRequests.filter(r => r.status === 'approved').length}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="max-w-2xl">
                            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Name</Label>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {profile.profile ?
                                            `${profile.profile.first_name || ''} ${profile.profile.last_name || ''}`.trim() || 'Not specified' :
                                            profile.name || 'Not specified'
                                        }
                                    </div>
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {profile.profile?.email || profile.email || 'Not specified'}
                                    </div>
                                </div>
                                <div>
                                    <Label>Specialization</Label>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {Array.isArray(profile.specialization) ?
                                            profile.specialization.join(', ') :
                                            profile.specialization || 'Not specified'
                                        }
                                    </div>
                                </div>
                                <div>
                                    <Label>Experience</Label>
                                    <div className="mt-1 text-sm text-slate-600">{profile.experience || 0} years</div>
                                </div>
                                <div>
                                    <Label>Rate</Label>
                                    <div className="mt-1 text-sm text-slate-600">₹{profile.hourly_rate || profile.rate || 0}/hour</div>
                                </div>
                                <div>
                                    <Label>Location</Label>
                                    <div className="mt-1 text-sm text-slate-600">{profile.location || 'Not specified'}</div>
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {profile.profile?.phone || profile.phone || 'Not specified'}
                                    </div>
                                </div>
                                <div>
                                    <Label>Languages</Label>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {Array.isArray(profile.languages) ?
                                            profile.languages.join(', ') :
                                            profile.languages || 'Not specified'
                                        }
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Bio</Label>
                                    <div className="mt-1 text-sm text-slate-600">{profile.bio || 'Not specified'}</div>
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Education</Label>
                                    <div className="mt-1 text-sm text-slate-600">{profile.education || 'Not specified'}</div>
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Certifications</Label>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {Array.isArray(profile.certifications) ?
                                            profile.certifications.join(', ') :
                                            profile.certifications || 'Not specified'
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-4">
                                <Button
                                    onClick={() => {
                                        advocateForm.reset({
                                            specialization: Array.isArray(profile.specialization) ?
                                                profile.specialization[0] : profile.specialization || '',
                                            experience: profile.experience || 0,
                                            bio: profile.bio || '',
                                            education: profile.education || '',
                                            certifications: Array.isArray(profile.certifications) ?
                                                profile.certifications.join(', ') : profile.certifications || '',
                                            hourly_rate: profile.hourly_rate || profile.rate || 0,
                                            languages: Array.isArray(profile.languages) ?
                                                profile.languages.join(', ') : profile.languages || ''
                                        });
                                        setIsUpdateDialogOpen(true);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Update Profile
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Profile
                                </Button>
                            </div>

                            {/* Update Profile Dialog */}
                            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Update Profile</DialogTitle>
                                    </DialogHeader>
                                    <Form {...advocateForm}>
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                advocateForm.handleSubmit((data) => {
                                                    onCreateProfile(data);
                                                    setIsUpdateDialogOpen(false);
                                                })(e);
                                            }}
                                            className="space-y-4"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={advocateForm.control}
                                                    name="specialization"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Specialization</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select specialization" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Corporate Law">Corporate Law</SelectItem>
                                                                    <SelectItem value="Criminal Law">Criminal Law</SelectItem>
                                                                    <SelectItem value="Family Law">Family Law</SelectItem>
                                                                    <SelectItem value="Constitutional Law">Constitutional Law</SelectItem>
                                                                    <SelectItem value="Civil Law">Civil Law</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={advocateForm.control}
                                                    name="experience"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Experience (years)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={advocateForm.control}
                                                name="hourly_rate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Hourly Rate (₹)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={advocateForm.control}
                                                name="bio"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bio</FormLabel>
                                                        <FormControl>
                                                            <Textarea {...field} placeholder="Tell us about yourself..." />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={advocateForm.control}
                                                name="education"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Education</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Your educational background" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={advocateForm.control}
                                                name="certifications"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Certifications (comma-separated)</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Certification 1, Certification 2" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={advocateForm.control}
                                                name="languages"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Languages (comma-separated)</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Hindi, English" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsUpdateDialogOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={advocateForm.formState.isSubmitting}
                                                >
                                                    {advocateForm.formState.isSubmitting ? 'Updating...' : 'Update Profile'}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>

                            {/* Delete Profile Dialog */}
                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Delete Profile</DialogTitle>
                                        <DialogDescription>
                                            Are you sure you want to delete your advocate profile? This action cannot be undone.
                                            All your consultation history and ratings will be permanently lost.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsDeleteDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={async () => {
                                                try {
                                                    const response = await fetch('/api/advocate/profile', {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        credentials: 'include',
                                                    });

                                                    if (response.ok) {
                                                        setAdvocateProfile(null);
                                                        setIsDeleteDialogOpen(false);
                                                        toast({
                                                            title: "Profile Deleted",
                                                            description: "Your advocate profile has been deleted successfully.",
                                                        });
                                                    } else {
                                                        throw new Error('Failed to delete profile');
                                                    }
                                                } catch (error) {
                                                    console.error('Delete profile error:', error);
                                                    toast({
                                                        title: "Error",
                                                        description: "Failed to delete profile. Please try again.",
                                                        variant: "destructive",
                                                    });
                                                }
                                            }}
                                        >
                                            Delete Profile
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoConsult;