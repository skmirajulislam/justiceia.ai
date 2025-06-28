# Video Consultation System - JusticeIA

## Overview

A comprehensive video consultation platform for legal services with separate interfaces for clients and advocates, featuring real-time video calls, chat, payment processing, and consultation management.

## Features Implemented

### 🎯 Core Features
- **Dual Dashboard System**: Separate interfaces for clients and advocates
- **Real-time Video Calls**: WebRTC-based video consultation with Google Meet-like functionality
- **Real-time Chat**: Socket.IO-powered messaging system
- **Payment Integration**: Complete payment flow with access control
- **Request Management**: Consultation request/approval/rejection workflows
- **24-hour Access Control**: Timed access after payment completion

### 👤 Client Features
- Browse available advocates by specialization
- Send consultation requests with custom messages
- Track request status (pending/approved/rejected)
- Payment processing for approved requests
- Video call and chat access after payment
- Emergency consultation option

### ⚖️ Advocate Features
- Professional profile management (create/edit)
- Dashboard with consultation statistics
- Request management (approve/reject requests)
- Video call and chat with paid clients
- Real-time notifications for new requests

### 💰 Payment & Access System
- Secure payment processing
- Automatic access granting after payment
- 24-hour access expiration
- Payment status tracking
- Access control for video/chat features

### 🎥 Video Call Features
- High-quality WebRTC video calls
- Audio/video controls (mute/unmute, camera on/off)
- Real-time connection status
- Professional video call interface
- Automatic call termination

### 💬 Chat System
- Real-time messaging via Socket.IO
- Message history
- Read status indicators
- Professional chat interface
- Persistent chat sessions

## Technical Architecture

### Frontend Components
```
VideoConsult.tsx (Main Component)
├── ClientDashboard
│   ├── Lawyer browsing and filtering
│   ├── Request management
│   ├── Payment interface
│   └── Access to video/chat
├── AdvocateDashboard
│   ├── Profile management
│   ├── Request approval/rejection
│   ├── Statistics dashboard
│   └── Client communication
├── VideoCallModal
│   ├── WebRTC video interface
│   ├── Audio/video controls
│   └── Call management
└── ChatModal
    ├── Real-time messaging
    ├── Message history
    └── Send/receive interface
```

### Backend API Routes
```
/api/consultation/
├── request/          - POST/GET consultation requests
├── approve/[id]/     - PUT approve request
└── reject/[id]/      - PUT reject request

/api/advocate/
└── profile/          - CRUD advocate profiles

/api/payment/
├── create/           - POST create payment
└── process/[id]/     - POST process payment

/api/access/
└── grant/            - POST/GET access control

/pages/api/
└── socket.ts         - Socket.IO server for real-time features
```

### Real-time Features (Socket.IO)
- **Consultation Requests**: Real-time notifications for new requests
- **Request Updates**: Live status updates (approved/rejected)
- **Chat Messages**: Instant messaging between clients and advocates
- **Video Call Signaling**: WebRTC signaling for video calls
- **User Presence**: Online/offline status tracking

## Usage Guide

### For Clients
1. **Browse Advocates**: Use filters to find advocates by specialization
2. **Request Consultation**: Click "Request Consultation" and provide details
3. **Wait for Approval**: Advocates will approve/reject your request
4. **Make Payment**: Pay for approved consultations to gain access
5. **Start Communication**: Use video call or chat features after payment

### For Advocates
1. **Create Profile**: Set up your professional profile with specialization
2. **Manage Requests**: View and approve/reject incoming consultation requests
3. **Communicate**: Video call or chat with clients who have paid access
4. **Track Statistics**: Monitor your consultation metrics on the dashboard

### System Flow
```
Client Request → Advocate Approval → Payment → 24hr Access → Video/Chat → Expiration
```

## Demo Data

### Mock Lawyers
- **Adv. Priya Sharma** - Corporate Law (12 years, ₹2500/hour)
- **Adv. Rajesh Kumar** - Criminal Law (15 years, ₹3000/hour)
- **Adv. Meera Patel** - Family Law (8 years, ₹2000/hour)
- **Adv. Arjun Singh** - Constitutional Law (20 years, ₹4000/hour)

### Mock Consultation Requests
- Sample requests with different statuses (pending/approved/rejected)
- Various payment states (pending/paid/failed)
- Different consultation types (video/chat)

## Access Control Matrix

| Status | Payment | Video Call | Chat | Duration |
|--------|---------|------------|------|----------|
| Pending | - | ❌ | ❌ | - |
| Approved | Pending | ❌ | ❌ | - |
| Approved | Paid | ✅ | ✅ | 24 hours |
| Rejected | - | ❌ | ❌ | - |

## Security Features

- **Payment Verification**: Access only after successful payment
- **Time-based Access**: Automatic expiration after 24 hours
- **Role-based Permissions**: Separate client/advocate capabilities
- **Real-time Validation**: Server-side access checks
- **Secure WebRTC**: Private peer-to-peer video connections

## Installation & Setup

1. **Dependencies Installed**:
   ```bash
   npm install socket.io socket.io-client
   ```

2. **Key Files**:
   - `/components/function/VideoConsult.tsx` - Main component
   - `/pages/api/socket.ts` - Socket.IO server
   - API routes in `/app/api/` directory

3. **Access the System**:
   - Navigate to `/consult` in your browser
   - Switch between Client and Advocate modes using the toggle
   - Test full consultation workflow

## Current Status

✅ **Completed Features**:
- Complete UI/UX for both client and advocate dashboards
- Real-time Socket.IO integration
- All backend API routes implemented
- Payment flow with access control
- Video call functionality with WebRTC
- Chat system with real-time messaging
- Request management workflows
- Professional advocate profile system
- Mock data for comprehensive testing

✅ **Technical Status**:
- All TypeScript errors resolved
- No linting errors
- Responsive design implementation
- Professional UI components
- Error handling and loading states
- Toast notifications for user feedback

## Demo & Testing

The system is now fully functional and ready for testing:

1. **Start the development server**: `npm run dev`
2. **Access the consultation page**: `http://localhost:3000/consult`
3. **Test Client Flow**: Request consultation → Wait for approval → Make payment → Access video/chat
4. **Test Advocate Flow**: Switch to advocate mode → Manage requests → Communicate with clients
5. **Test Real-time Features**: Open multiple browser tabs to test real-time communication

## Future Enhancements

- Database integration for persistent storage
- Production-ready payment gateway integration
- Advanced video call features (screen sharing, recording)
- Mobile app compatibility
- Advanced scheduling system
- Review and rating system
- Document sharing capabilities
- Integration with calendar systems

---

**Note**: This is a fully functional demo system with in-memory storage. For production use, integrate with a database and real payment processing system.
