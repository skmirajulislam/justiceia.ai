import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}

interface VideoCallData {
    callId: string;
    participantId: string;
    participantName: string;
}

let io: Server;
// userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

const initSocket = (server: HTTPServer) => {
    if (!io) {
        io = new Server(server, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: process.env.NODE_ENV === 'production'
                    ? ['https://your-domain.com']
                    : ['http://localhost:3000'],
                methods: ['GET', 'POST']
            }
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Join user to their room
            socket.on('join-room', (userId: string) => {
                socket.join(userId);

                // Add this socket to the user's set
                if (!onlineUsers.has(userId)) {
                    onlineUsers.set(userId, new Set());
                }
                onlineUsers.get(userId)!.add(socket.id);

                // Broadcast to all clients that this user is online
                socket.broadcast.emit('user-online', { userId, isOnline: true });

                // Send current online users list to the joining user
                const onlineUserIds = Array.from(onlineUsers.entries())
                    .filter(([_, sockets]) => sockets.size > 0)
                    .map(([id]) => id);
                socket.emit('online-users-list', onlineUserIds);
            });

            // Handle user online status (legacy, can be kept for compatibility)
            socket.on('user-online', (data: { userId: string, isOnline: boolean }) => {
                if (data.isOnline) {
                    if (!onlineUsers.has(data.userId)) {
                        onlineUsers.set(data.userId, new Set());
                    }
                    onlineUsers.get(data.userId)!.add(socket.id);
                } else {
                    if (onlineUsers.has(data.userId)) {
                        onlineUsers.get(data.userId)!.delete(socket.id);
                        if (onlineUsers.get(data.userId)!.size === 0) {
                            onlineUsers.delete(data.userId);
                        }
                    }
                }
                // Broadcast to all connected clients
                socket.broadcast.emit('user-online', data);
            });

            // Send current online users list
            socket.on('get-online-users', () => {
                const onlineUserIds = Array.from(onlineUsers.entries())
                    .filter(([_, sockets]) => sockets.size > 0)
                    .map(([id]) => id);
                socket.emit('online-users-list', onlineUserIds);
            });

            // Handle typing indicator
            socket.on('user-typing', (data: { userId: string, targetUserId: string, isTyping: boolean }) => {
                socket.to(data.targetUserId).emit('user-typing', {
                    userId: data.userId,
                    isTyping: data.isTyping
                });
            });

            // Handle chat messages
            socket.on('send-message', (message: ChatMessage) => {
                // Emit to the receiver
                socket.to(message.receiverId).emit('chat-message', message);

                // Here you would typically save to database
                console.log('Message sent:', message);
            });

            // Handle video call signaling
            socket.on('start-video-call', (data: VideoCallData) => {
                socket.to(data.participantId).emit('video-call-incoming', {
                    callId: data.callId,
                    from: data.participantName,
                    callerId: socket.id
                });
            });

            socket.on('accept-video-call', (data: { callId: string, participantId: string }) => {
                socket.to(data.participantId).emit('video-call-accepted', {
                    callId: data.callId
                });
            });

            socket.on('reject-video-call', (data: { callId: string, participantId: string }) => {
                socket.to(data.participantId).emit('video-call-rejected', {
                    callId: data.callId
                });
            });

            socket.on('end-video-call', (data: { callId: string }) => {
                socket.broadcast.emit('video-call-ended', {
                    callId: data.callId
                });
            });

            socket.on('offer', (data: { offer: RTCSessionDescriptionInit, targetId: string }) => {
                socket.to(data.targetId).emit('offer', {
                    offer: data.offer,
                    senderId: socket.id
                });
            });

            socket.on('answer', (data: { answer: RTCSessionDescriptionInit, targetId: string }) => {
                socket.to(data.targetId).emit('answer', {
                    answer: data.answer,
                    senderId: socket.id
                });
            });

            socket.on('ice-candidate', (data: { candidate: RTCIceCandidate, targetId: string }) => {
                socket.to(data.targetId).emit('ice-candidate', {
                    candidate: data.candidate,
                    senderId: socket.id
                });
            });

            socket.on('consultation-request', (request: { advocateId: string;[key: string]: unknown }) => {
                socket.to(request.advocateId).emit('consultation-request', request);
            });

            socket.on('request-approved', (request: { clientId: string;[key: string]: unknown }) => {
                socket.to(request.clientId).emit('request-approved', request);
            });

            socket.on('request-rejected', (request: { clientId: string;[key: string]: unknown }) => {
                socket.to(request.clientId).emit('request-rejected', request);
            });

            socket.on('disconnect', () => {
                // Remove this socket from all user sets
                for (const [userId, sockets] of onlineUsers.entries()) {
                    if (sockets.has(socket.id)) {
                        sockets.delete(socket.id);
                        if (sockets.size === 0) {
                            onlineUsers.delete(userId);
                            // Broadcast to all clients that user is offline
                            socket.broadcast.emit('user-online', { userId, isOnline: false });
                        }
                        break;
                    }
                }
            });
        });
    }

    return io;
};

export default function handler(req: NextApiRequest, res: NextApiResponse & { socket: { server: HTTPServer & { io?: Server } } }) {
    if (!res.socket.server.io) {
        console.log('Setting up Socket.IO server...');
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
