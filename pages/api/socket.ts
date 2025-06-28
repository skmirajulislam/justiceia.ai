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
const onlineUsers = new Map<string, string>(); // userId -> socketId

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
                console.log(`User ${userId} joined room`);
            });

            // Handle user online status
            socket.on('user-online', (data: { userId: string, isOnline: boolean }) => {
                if (data.isOnline) {
                    onlineUsers.set(data.userId, socket.id);
                    console.log(`User ${data.userId} is now online`);
                } else {
                    onlineUsers.delete(data.userId);
                    console.log(`User ${data.userId} is now offline`);
                }
                
                // Broadcast to all connected clients
                socket.broadcast.emit('user-online', data);
            });

            // Send current online users list
            socket.on('get-online-users', () => {
                const onlineUserIds = Array.from(onlineUsers.keys());
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
                // Notify all participants in the call
                socket.broadcast.emit('video-call-ended', {
                    callId: data.callId
                });
            });

            // WebRTC signaling
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

            // Handle consultation requests
            socket.on('consultation-request', (request: { advocateId: string;[key: string]: unknown }) => {
                // Emit to the advocate
                socket.to(request.advocateId).emit('consultation-request', request);
            });

            socket.on('request-approved', (request: { clientId: string;[key: string]: unknown }) => {
                // Emit to the client
                socket.to(request.clientId).emit('request-approved', request);
            });

            socket.on('request-rejected', (request: { clientId: string;[key: string]: unknown }) => {
                // Emit to the client
                socket.to(request.clientId).emit('request-rejected', request);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                
                // Find and remove the user from online users
                for (const [userId, socketId] of onlineUsers.entries()) {
                    if (socketId === socket.id) {
                        onlineUsers.delete(userId);
                        console.log(`User ${userId} disconnected and is now offline`);
                        
                        // Broadcast to all connected clients that user is offline
                        socket.broadcast.emit('user-online', { userId, isOnline: false });
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
