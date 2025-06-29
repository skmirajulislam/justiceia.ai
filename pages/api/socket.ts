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
    participantName: string;
    offer: RTCSessionDescriptionInit;
    callerId: string;
    callerName: string;
}

interface VideoCallAnswer {
    callId: string;
    targetId: string;
    answer: RTCSessionDescriptionInit;
}

interface IceCandidateData {
    candidate: RTCIceCandidate;
    targetId: string;
    callId: string;
}

interface CallRejectedData {
    callId: string;
    targetId: string;
}

interface CallEndedData {
    callId: string;
    targetId: string;
}

interface UserStatusData {
    userId: string;
    isOnline: boolean;
}

// Map to track online users and their socket IDs
const onlineUsers = new Map<string, Set<string>>();
let io: Server;

export const initSocket = (server: HTTPServer): Server => {
    if (!io) {
        io = new Server(server, {
            path: '/pages/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: process.env.NODE_ENV === 'production'
                    ? ['https://your-domain.com']
                    : ['http://localhost:3000'],
                methods: ['GET', 'POST']
            }
        });

        io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);

            // Register user and track online status
            socket.on('register-user', (userId: string) => {
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
                socket.to(message.receiverId).emit('chat-message', message);
            });

            // Handle message read receipts
            socket.on('message-seen', (messageId: string) => {
                console.log(`Message ${messageId} has been seen`);
            });

            // Handle video call initiation
            socket.on('start-video-call', (data: VideoCallOffer) => {
                socket.to(data.participantId).emit('video-call-incoming', {
                    callId: data.callId,
                    from: data.callerId,
                    fromName: data.callerName,
                    offer: data.offer
                });
            });

            // Handle call acceptance
            socket.on('call-accepted', (data: VideoCallAnswer) => {
                socket.to(data.targetId).emit('call-answer', {
                    callId: data.callId,
                    answer: data.answer
                });
            });

            // Handle ICE candidates
            socket.on('ice-candidate', (data: IceCandidateData) => {
                socket.to(data.targetId).emit('ice-candidate', data);
            });

            // Handle call rejection
            socket.on('call-rejected', (data: CallRejectedData) => {
                socket.to(data.targetId).emit('call-rejected', {
                    callId: data.callId
                });
            });

            // Handle call ending
            socket.on('end-call', (data: CallEndedData) => {
                socket.to(data.targetId).emit('call-ended', {
                    callId: data.callId
                });
            });

            // Handle call attempt notifications (for offline users)
            socket.on('call-attempt-notification', (data: {
                targetUserId: string;
                callerName: string;
                callerId: string;
            }) => {
                console.log(`Call attempt from ${data.callerName} to ${data.targetUserId}`);
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
        console.log('Initializing Socket.IO server...');
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