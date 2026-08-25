'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface IncomingCall {
    callId: string;
    from: string;
    fromName: string;
    fromRole?: string;
    offer: RTCSessionDescriptionInit;
    callType?: 'video' | 'audio';
}

export interface VideoCallState {
    isInCall: boolean;
    callId: string | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isRemoteMuted: boolean;
    isRemoteVideoOff: boolean;
    isRemoteScreenSharing: boolean;
    peerConnection: RTCPeerConnection | null;
    callStatus: 'idle' | 'calling' | 'ringing' | 'ongoing' | 'reconnecting' | 'ended';
    callDuration: number;
    networkQuality: 'excellent' | 'good' | 'poor';
    isSpeakingLocal: boolean;
    isSpeakingRemote: boolean;
    callerInfo: {
        id: string;
        name: string;
        role?: string;
    } | null;
}

export interface WebRTCContextType {
    socket: Socket | null;
    onlineUsers: Set<string>;
    videoCall: VideoCallState;
    incomingCall: IncomingCall | null;
    startCall: (targetUserId: string, targetUserName: string, targetUserRole?: string) => Promise<void>;
    acceptCall: (withVideo?: boolean) => Promise<void>;
    rejectCall: (reason?: string) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => Promise<void>;
    flipCamera: () => Promise<void>;
}

const WebRTCContext = createContext<WebRTCContextType>({
    socket: null,
    onlineUsers: new Set(),
    videoCall: {
        isInCall: false,
        callId: null,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isRemoteMuted: false,
        isRemoteVideoOff: false,
        isRemoteScreenSharing: false,
        peerConnection: null,
        callStatus: 'idle',
        callDuration: 0,
        networkQuality: 'excellent',
        isSpeakingLocal: false,
        isSpeakingRemote: false,
        callerInfo: null,
    },
    incomingCall: null,
    startCall: async () => {},
    acceptCall: async () => {},
    rejectCall: () => {},
    endCall: () => {},
    toggleMute: () => {},
    toggleVideo: () => {},
    toggleScreenShare: async () => {},
    flipCamera: async () => {},
});

export const useWebRTC = () => useContext(WebRTCContext);

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
};

// High-fidelity HD Audio & Video constraints (Google Meet / WhatsApp standard)
const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
    },
    video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user',
    },
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const { toast } = useToast();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

    const [videoCall, setVideoCall] = useState<VideoCallState>({
        isInCall: false,
        callId: null,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isRemoteMuted: false,
        isRemoteVideoOff: false,
        isRemoteScreenSharing: false,
        peerConnection: null,
        callStatus: 'idle',
        callDuration: 0,
        networkQuality: 'excellent',
        isSpeakingLocal: false,
        isSpeakingRemote: false,
        callerInfo: null,
    });

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const ringtoneAudioRef = useRef<AudioContext | null>(null);
    const ringtoneOscRef = useRef<OscillatorNode | null>(null);
    const currentFacingModeRef = useRef<'user' | 'environment'>('user');

    // 1. Initialize Socket Connection with Pre-fetch to /api/socket
    useEffect(() => {
        if (!session?.user?.id) return;

        let activeSocket: Socket | null = null;

        const initSocketClient = async () => {
            try {
                // Ensure Next.js Pages API socket handler is mounted
                await fetch('/api/socket').catch(() => {});

                activeSocket = io({
                    path: '/api/socket',
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000,
                    transports: ['websocket', 'polling'],
                });

                activeSocket.on('connect', () => {
                    console.log('Connected to WebRTC signaling server:', activeSocket?.id);
                    activeSocket?.emit('register-user', session.user.id);
                });

                activeSocket.on('online-users', (users: string[]) => {
                    setOnlineUsers(new Set(users));
                });

                activeSocket.on('user-status-changed', (data: { userId: string; isOnline: boolean }) => {
                    setOnlineUsers(prev => {
                        const updated = new Set(prev);
                        if (data.isOnline) {
                            updated.add(data.userId);
                        } else {
                            updated.delete(data.userId);
                        }
                        return updated;
                    });
                });

                setSocket(activeSocket);
            } catch (err) {
                console.error('Socket init error:', err);
            }
        };

        initSocketClient();

        return () => {
            if (activeSocket) {
                activeSocket.disconnect();
            }
        };
    }, [session?.user?.id]);

    // Ringtone generator using Web Audio API (cross-platform & zero missing asset error)
    const playRingtone = useCallback(() => {
        try {
            if (ringtoneAudioRef.current) return;
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
            osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.2); // D5

            gain.gain.setValueAtTime(0.1, ctx.currentTime);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            ringtoneAudioRef.current = ctx;
            ringtoneOscRef.current = osc;
        } catch (e) {
            console.warn('Audio ringtone playback error:', e);
        }
    }, []);

    const stopRingtone = useCallback(() => {
        try {
            if (ringtoneOscRef.current) {
                ringtoneOscRef.current.stop();
                ringtoneOscRef.current.disconnect();
                ringtoneOscRef.current = null;
            }
            if (ringtoneAudioRef.current) {
                ringtoneAudioRef.current.close();
                ringtoneAudioRef.current = null;
            }
        } catch (e) {
            console.warn('Stop ringtone error:', e);
        }
    }, []);

    // 2. Call Duration Timer
    useEffect(() => {
        if (videoCall.callStatus === 'ongoing') {
            if (!timerIntervalRef.current) {
                timerIntervalRef.current = setInterval(() => {
                    setVideoCall(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
                }, 1000);
            }
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [videoCall.callStatus]);

    // Clean up media streams and peer connection
    const cleanupMedia = useCallback(() => {
        stopRingtone();

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            localStreamRef.current = null;
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(track => track.stop());
            remoteStreamRef.current = null;
        }

        if (pcRef.current) {
            pcRef.current.ontrack = null;
            pcRef.current.onicecandidate = null;
            pcRef.current.onconnectionstatechange = null;
            pcRef.current.oniceconnectionstatechange = null;
            pcRef.current.close();
            pcRef.current = null;
        }

        candidateQueueRef.current = [];

        setVideoCall({
            isInCall: false,
            callId: null,
            localStream: null,
            remoteStream: null,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false,
            isRemoteMuted: false,
            isRemoteVideoOff: false,
            isRemoteScreenSharing: false,
            peerConnection: null,
            callStatus: 'idle',
            callDuration: 0,
            networkQuality: 'excellent',
            isSpeakingLocal: false,
            isSpeakingRemote: false,
            callerInfo: null,
        });
    }, [stopRingtone]);

    // Initialize RTCPeerConnection
    const createPeerConnection = useCallback((targetId: string, currentCallId: string): RTCPeerConnection => {
        if (pcRef.current) {
            pcRef.current.close();
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate.toJSON(),
                    targetId,
                    callId: currentCallId,
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('Received remote media stream track:', event.track.kind);
            if (event.streams && event.streams[0]) {
                remoteStreamRef.current = event.streams[0];
                setVideoCall(prev => ({
                    ...prev,
                    remoteStream: event.streams[0],
                    callStatus: 'ongoing',
                }));
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('PeerConnection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setVideoCall(prev => ({ ...prev, callStatus: 'ongoing', networkQuality: 'excellent' }));
            } else if (pc.connectionState === 'disconnected') {
                setVideoCall(prev => ({ ...prev, callStatus: 'reconnecting', networkQuality: 'poor' }));
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                cleanupMedia();
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected') {
                setVideoCall(prev => ({ ...prev, networkQuality: 'poor' }));
            } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setVideoCall(prev => ({ ...prev, networkQuality: 'excellent' }));
            }
        };

        return pc;
    }, [socket, cleanupMedia]);

    // Process Queued ICE Candidates after setRemoteDescription
    const processCandidateQueue = useCallback(async () => {
        if (!pcRef.current || !pcRef.current.remoteDescription) return;
        while (candidateQueueRef.current.length > 0) {
            const candidate = candidateQueueRef.current.shift();
            if (candidate) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.warn('Error adding queued ICE candidate:', err);
                }
            }
        }
    }, []);

    // 3. Initiate Video Call
    const startCall = async (targetUserId: string, targetUserName: string, targetUserRole?: string) => {
        if (!session?.user?.id) {
            toast({ title: 'Authentication required', description: 'Please sign in to start a video call', variant: 'destructive' });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
            localStreamRef.current = stream;

            const callId = `call_${session.user.id}_${Date.now()}`;
            const pc = createPeerConnection(targetUserId, callId);

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });

            await pc.setLocalDescription(offer);

            setVideoCall({
                isInCall: true,
                callId,
                localStream: stream,
                remoteStream: null,
                isMuted: false,
                isVideoOff: false,
                isScreenSharing: false,
                isRemoteMuted: false,
                isRemoteVideoOff: false,
                isRemoteScreenSharing: false,
                peerConnection: pc,
                callStatus: 'calling',
                callDuration: 0,
                networkQuality: 'excellent',
                isSpeakingLocal: false,
                isSpeakingRemote: false,
                callerInfo: {
                    id: targetUserId,
                    name: targetUserName,
                    role: targetUserRole,
                },
            });

            if (socket) {
                socket.emit('start-video-call', {
                    callId,
                    participantId: targetUserId,
                    participantName: targetUserName,
                    offer,
                    callerId: session.user.id,
                    callerName: `${session.user.name || 'Advocate'}`,
                    callerRole: session.user.role || 'User',
                    callType: 'video',
                });
            }
        } catch (error: any) {
            console.error('Error initiating video call:', error);
            cleanupMedia();
            toast({
                title: 'Camera/Microphone Permission Required',
                description: error.message || 'Please enable camera and mic access to proceed with consultation.',
                variant: 'destructive',
            });
        }
    };

    // 4. Accept Incoming Call
    const acceptCall = async (withVideo: boolean = true) => {
        if (!incomingCall || !session?.user?.id) return;
        stopRingtone();

        try {
            const constraints: MediaStreamConstraints = {
                audio: MEDIA_CONSTRAINTS.audio,
                video: withVideo ? MEDIA_CONSTRAINTS.video : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;

            const pc = createPeerConnection(incomingCall.from, incomingCall.callId);

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            await processCandidateQueue();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setVideoCall({
                isInCall: true,
                callId: incomingCall.callId,
                localStream: stream,
                remoteStream: null,
                isMuted: false,
                isVideoOff: !withVideo,
                isScreenSharing: false,
                isRemoteMuted: false,
                isRemoteVideoOff: false,
                isRemoteScreenSharing: false,
                peerConnection: pc,
                callStatus: 'ongoing',
                callDuration: 0,
                networkQuality: 'excellent',
                isSpeakingLocal: false,
                isSpeakingRemote: false,
                callerInfo: {
                    id: incomingCall.from,
                    name: incomingCall.fromName,
                    role: incomingCall.fromRole,
                },
            });

            if (socket) {
                socket.emit('call-accepted', {
                    callId: incomingCall.callId,
                    answer,
                    targetId: incomingCall.from,
                });
            }

            setIncomingCall(null);
        } catch (error: any) {
            console.error('Error accepting video call:', error);
            cleanupMedia();
            toast({
                title: 'Failed to accept call',
                description: error.message || 'Could not access media devices.',
                variant: 'destructive',
            });
        }
    };

    // 5. Reject Incoming Call
    const rejectCall = (reason: string = 'Call declined') => {
        stopRingtone();
        if (socket && incomingCall) {
            socket.emit('call-rejected', {
                callId: incomingCall.callId,
                targetId: incomingCall.from,
                reason,
            });
        }
        setIncomingCall(null);
    };

    // 6. End Active Call
    const endCall = () => {
        if (socket && videoCall.callId && videoCall.callerInfo) {
            socket.emit('end-call', {
                callId: videoCall.callId,
                targetId: videoCall.callerInfo.id,
            });
        }
        cleanupMedia();
        toast({ title: 'Consultation Ended', description: 'The video consultation has concluded.' });
    };

    // 7. Toggle Microphone Mute
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const isNowMuted = !audioTrack.enabled;
                setVideoCall(prev => ({ ...prev, isMuted: isNowMuted }));

                if (socket && videoCall.callerInfo && videoCall.callId) {
                    socket.emit('toggle-media-status', {
                        callId: videoCall.callId,
                        targetId: videoCall.callerInfo.id,
                        isMuted: isNowMuted,
                    });
                }
            }
        }
    };

    // 8. Toggle Video Camera
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const isNowOff = !videoTrack.enabled;
                setVideoCall(prev => ({ ...prev, isVideoOff: isNowOff }));

                if (socket && videoCall.callerInfo && videoCall.callId) {
                    socket.emit('toggle-media-status', {
                        callId: videoCall.callId,
                        targetId: videoCall.callerInfo.id,
                        isVideoOff: isNowOff,
                    });
                }
            }
        }
    };

    // 9. Screen Sharing (Google Meet style seamless track replacement)
    const toggleScreenShare = async () => {
        if (!pcRef.current || !videoCall.isInCall) return;

        if (videoCall.isScreenSharing) {
            // Revert back to camera track
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: MEDIA_CONSTRAINTS.video });
                const newVideoTrack = cameraStream.getVideoTracks()[0];

                const senders = pcRef.current.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(newVideoTrack);
                }

                // Stop old display track
                localStreamRef.current?.getVideoTracks().forEach(t => t.stop());

                // Update local stream
                if (localStreamRef.current) {
                    const audioTrack = localStreamRef.current.getAudioTracks()[0];
                    const combined = new MediaStream([audioTrack, newVideoTrack].filter(Boolean) as MediaStreamTrack[]);
                    localStreamRef.current = combined;
                    setVideoCall(prev => ({ ...prev, localStream: combined, isScreenSharing: false }));
                }

                if (socket && videoCall.callerInfo && videoCall.callId) {
                    socket.emit('toggle-media-status', {
                        callId: videoCall.callId,
                        targetId: videoCall.callerInfo.id,
                        isScreenSharing: false,
                    });
                }
            } catch (e) {
                console.error('Failed to revert to camera:', e);
            }
        } else {
            // Switch to Display Media (Screen Sharing)
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' } as any,
                    audio: false,
                });

                const screenTrack = displayStream.getVideoTracks()[0];

                // Handle user clicking "Stop Sharing" on browser banner
                screenTrack.onended = async () => {
                    await toggleScreenShare();
                };

                const senders = pcRef.current.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);
                }

                if (localStreamRef.current) {
                    const audioTrack = localStreamRef.current.getAudioTracks()[0];
                    const combined = new MediaStream([audioTrack, screenTrack].filter(Boolean) as MediaStreamTrack[]);
                    localStreamRef.current = combined;
                    setVideoCall(prev => ({ ...prev, localStream: combined, isScreenSharing: true }));
                }

                if (socket && videoCall.callerInfo && videoCall.callId) {
                    socket.emit('toggle-media-status', {
                        callId: videoCall.callId,
                        targetId: videoCall.callerInfo.id,
                        isScreenSharing: true,
                    });
                }
            } catch (err: any) {
                if (err.name !== 'NotAllowedError') {
                    toast({ title: 'Screen Share Failed', description: err.message, variant: 'destructive' });
                }
            }
        }
    };

    // 10. Flip Camera (Mobile / Laptop Camera Switch)
    const flipCamera = async () => {
        if (!pcRef.current || !videoCall.isInCall || videoCall.isScreenSharing) return;

        try {
            const newFacing = currentFacingModeRef.current === 'user' ? 'environment' : 'user';
            currentFacingModeRef.current = newFacing;

            const videoConstraints = typeof MEDIA_CONSTRAINTS.video === 'object' ? MEDIA_CONSTRAINTS.video : {};
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { ...videoConstraints, facingMode: newFacing },
            });
            const newTrack = newStream.getVideoTracks()[0];

            const senders = pcRef.current.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender) {
                await videoSender.replaceTrack(newTrack);
            }

            localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
            if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                const combined = new MediaStream([audioTrack, newTrack].filter(Boolean) as MediaStreamTrack[]);
                localStreamRef.current = combined;
                setVideoCall(prev => ({ ...prev, localStream: combined }));
            }
        } catch (e) {
            console.warn('Camera flip error:', e);
        }
    };

    // 11. Socket Event Listeners for WebRTC Signaling
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data: IncomingCall) => {
            console.log('Incoming consultation call received:', data);
            playRingtone();
            setIncomingCall(data);
        };

        const handleCallAnswer = async (data: { answer: RTCSessionDescriptionInit; callId: string }) => {
            console.log('Call answer received for call:', data.callId);
            if (pcRef.current && pcRef.current.signalingState !== 'closed') {
                try {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                    await processCandidateQueue();
                    setVideoCall(prev => ({ ...prev, callStatus: 'ongoing' }));
                } catch (e) {
                    console.error('Error setting remote description from answer:', e);
                }
            }
        };

        const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; callId: string }) => {
            if (!data?.candidate) return;
            if (pcRef.current && pcRef.current.remoteDescription) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.warn('Error adding ICE candidate:', e);
                }
            } else {
                candidateQueueRef.current.push(data.candidate);
            }
        };

        const handlePeerMediaStatus = (data: {
            callId: string;
            isMuted?: boolean;
            isVideoOff?: boolean;
            isScreenSharing?: boolean;
        }) => {
            setVideoCall(prev => ({
                ...prev,
                isRemoteMuted: data.isMuted !== undefined ? data.isMuted : prev.isRemoteMuted,
                isRemoteVideoOff: data.isVideoOff !== undefined ? data.isVideoOff : prev.isRemoteVideoOff,
                isRemoteScreenSharing: data.isScreenSharing !== undefined ? data.isScreenSharing : prev.isRemoteScreenSharing,
            }));
        };

        const handleCallRejected = (data: { callId: string; reason?: string }) => {
            cleanupMedia();
            toast({
                title: 'Call Declined',
                description: data.reason || 'The advocate or client is currently unavailable.',
            });
        };

        const handleCallEnded = () => {
            cleanupMedia();
            toast({
                title: 'Call Ended',
                description: 'The other participant has disconnected from the consultation.',
            });
        };

        socket.on('video-call-incoming', handleIncomingCall);
        socket.on('call-answer', handleCallAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('peer-media-status', handlePeerMediaStatus);
        socket.on('call-rejected', handleCallRejected);
        socket.on('call-ended', handleCallEnded);

        return () => {
            socket.off('video-call-incoming', handleIncomingCall);
            socket.off('call-answer', handleCallAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('peer-media-status', handlePeerMediaStatus);
            socket.off('call-rejected', handleCallRejected);
            socket.off('call-ended', handleCallEnded);
        };
    }, [socket, playRingtone, processCandidateQueue, cleanupMedia, toast]);

    return (
        <WebRTCContext.Provider
            value={{
                socket,
                onlineUsers,
                videoCall,
                incomingCall,
                startCall,
                acceptCall,
                rejectCall,
                endCall,
                toggleMute,
                toggleVideo,
                toggleScreenShare,
                flipCamera,
            }}
        >
            {children}
        </WebRTCContext.Provider>
    );
};
