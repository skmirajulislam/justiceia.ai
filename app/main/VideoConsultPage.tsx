'use client';

import VideoConsult from '@/components/function/VideoConsult';
import { WebRTCProvider } from '@/components/webrtc/WebRTCProvider';

export default function ConsultPage() {
    return (
        <WebRTCProvider>
            <VideoConsult />
        </WebRTCProvider>
    );
}