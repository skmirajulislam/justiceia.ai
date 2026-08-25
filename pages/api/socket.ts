import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}

interface VideoCallOffer {
    callId: string;
    participantId: string;
    participantName?: string;
    offer: RTCSessionDescriptionInit;
    callerId: string;
    callerName: string;
    callerRole?: string;
    callType?: 'video' | 'audio';
}

interface VideoCallAnswer {
    callId: string;
    targetId: string;
    answer: RTCSessionDescriptionInit;
}

interface IceCandidateData {
    candidate: RTCIceCandidateInit | RTCIceCandidate;
    targetId: string;
    callId: string;
}

interface CallRejectedData {
    callId: string;
    targetId: string;
    reason?: string;
}

interface CallEndedData {
    callId: string;
    targetId: string;
}

interface MediaStatusData {
    callId: string;
    targetId: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
    isScreenSharing?: boolean;
}

interface UserStatusData {
    userId: string;
    isOnline: boolean;
}

// Map to track online users and their active socket IDs
const onlineUsers = new Map<string, Set<string>>();
let io: Server;

export const initSocket = (server: HTTPServer): Server => {
    if (!io) {
        io = new Server(server, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        io.on('connection', (socket: Socket) => {
            console.log('Socket client connected:', socket.id);

            // Register user, join personal room, and track online status
            socket.on('register-user', (userId: string) => {
                if (!userId) return;

                // Join the user's personal room for direct routing (WebRTC, chat)
                socket.join(userId);

                if (!onlineUsers.has(userId)) {
                    onlineUsers.set(userId, new Set());
                }
                onlineUsers.get(userId)!.add(socket.id);

                // Broadcast user online status
                const statusData: UserStatusData = { userId, isOnline: true };
                socket.broadcast.emit('user-status-changed', statusData);

                // Send current online users list
                io.emit('online-users', Array.from(onlineUsers.keys()));
            });

            // Handle chat messages
            socket.on('send-message', (message: ChatMessage) => {
                if (message?.receiverId) {
                    socket.to(message.receiverId).emit('chat-message', message);
                }
            });

            // Handle typing status
            socket.on('typing', (data: { targetUserId: string; isTyping: boolean; senderId: string }) => {
                if (data?.targetUserId) {
                    socket.to(data.targetUserId).emit('typing-status', data);
                }
            });

            // Handle message read receipts
            socket.on('message-seen', (messageId: string) => {
                console.log(`Message ${messageId} seen`);
            });

            // Handle video call initiation
            socket.on('start-video-call', (data: VideoCallOffer) => {
                if (!data?.participantId) return;
                console.log(`Starting video call from ${data.callerName} (${data.callerId}) to ${data.participantId}`);
                socket.to(data.participantId).emit('video-call-incoming', {
                    callId: data.callId,
                    from: data.callerId,
                    fromName: data.callerName,
                    fromRole: data.callerRole || 'User',
                    offer: data.offer,
                    callType: data.callType || 'video'
                });
            });

            // Handle call acceptance
            socket.on('call-accepted', (data: VideoCallAnswer) => {
                if (!data?.targetId) return;
                console.log(`Call accepted by ${socket.id}, sending answer to target: ${data.targetId}`);
                socket.to(data.targetId).emit('call-answer', {
                    callId: data.callId,
                    answer: data.answer
                });
            });

            // Handle ICE candidates
            socket.on('ice-candidate', (data: IceCandidateData) => {
                if (!data?.targetId || !data?.candidate) return;
                socket.to(data.targetId).emit('ice-candidate', data);
            });

            // Handle media status sync (mute, camera off, screenshare)
            socket.on('toggle-media-status', (data: MediaStatusData) => {
                if (!data?.targetId) return;
                socket.to(data.targetId).emit('peer-media-status', data);
            });

            // Handle call rejection
            socket.on('call-rejected', (data: CallRejectedData) => {
                if (!data?.targetId) return;
                console.log(`Call ${data.callId} rejected for target ${data.targetId}`);
                socket.to(data.targetId).emit('call-rejected', {
                    callId: data.callId,
                    reason: data.reason || 'Call declined'
                });
            });

            // Handle call ending
            socket.on('end-call', (data: CallEndedData) => {
                if (!data?.targetId) return;
                console.log(`Ending call ${data.callId} for target ${data.targetId}`);
                socket.to(data.targetId).emit('call-ended', {
                    callId: data.callId
                });
            });

            // Handle call attempt notifications
            socket.on('call-attempt-notification', (data: {
                targetUserId: string;
                callerName: string;
                callerId: string;
            }) => {
                if (!data?.targetUserId) return;
                socket.to(data.targetUserId).emit('call-attempt-received', data);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                for (const [userId, sockets] of onlineUsers.entries()) {
                    if (sockets.has(socket.id)) {
                        sockets.delete(socket.id);

                        if (sockets.size === 0) {
                            onlineUsers.delete(userId);
                            const statusData: UserStatusData = { userId, isOnline: false };
                            socket.broadcast.emit('user-status-changed', statusData);
                        }
                        break;
                    }
                }
                io.emit('online-users', Array.from(onlineUsers.keys()));
            });
        });
    }
    return io;
};

export default function socketHandler(
    req: NextApiRequest,
    res: NextApiResponse & { socket: { server: HTTPServer & { io?: Server } } }
) {
    if (!res.socket.server.io) {
        console.log('Initializing Socket.IO server on path /api/socket...');
        const server = res.socket.server;
        res.socket.server.io = initSocket(server);
    }
    res.end();
}

export const config = {
    api: {
        bodyParser: false,
    },
};