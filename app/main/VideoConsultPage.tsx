'use client';
import VideoConsult from '@/components/function/VideoConsult'
import { SocketProvider } from '@/components/function/VideoConsult';
import { VideoCallProvider } from '@/components/function/VideoConsult';
export default function ConsultPage() {

    return (
        <SocketProvider>
            <VideoCallProvider>
                <VideoConsult />
            </VideoCallProvider>
        </SocketProvider>
    );
}