'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from './WebRTCProvider';
import {
    Mic,
    MicOff,
    Camera,
    CameraOff,
    PhoneOff,
    Monitor,
    MonitorOff,
    RefreshCw,
    Maximize2,
    Minimize2,
    Shield,
    Wifi,
    User,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const WebRTCVideoCallModal: React.FC = () => {
    const {
        videoCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        flipCamera,
    } = useWebRTC();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPiPMinimized, setIsPiPMinimized] = useState(false);

    // Bind local media stream to local video element
    useEffect(() => {
        if (localVideoRef.current && videoCall.localStream) {
            localVideoRef.current.srcObject = videoCall.localStream;
        }
    }, [videoCall.localStream]);

    // Bind remote media stream to remote video element
    useEffect(() => {
        if (remoteVideoRef.current && videoCall.remoteStream) {
            remoteVideoRef.current.srcObject = videoCall.remoteStream;
        }
    }, [videoCall.remoteStream]);

    if (!videoCall.isInCall) return null;

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between overflow-hidden select-none">
            {/* Top Bar (Glassmorphic Header) */}
            <div className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold">
                        {videoCall.callerInfo?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-base font-semibold text-white">
                                {videoCall.callerInfo?.name || 'Participant'}
                            </h2>
                            {videoCall.callerInfo?.role && (
                                <Badge variant="secondary" className="bg-sky-950/80 text-sky-300 border border-sky-800/50 text-[11px] px-2 py-0.5">
                                    {videoCall.callerInfo.role}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                            <span className="flex items-center text-emerald-400">
                                <Shield className="w-3.5 h-3.5 mr-1" /> End-to-End Encrypted
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">{formatDuration(videoCall.callDuration)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-xs text-slate-300">
                        <Wifi className={`w-3.5 h-3.5 ${videoCall.networkQuality === 'excellent' ? 'text-emerald-400' : videoCall.networkQuality === 'good' ? 'text-amber-400' : 'text-red-400'}`} />
                        <span className="capitalize">{videoCall.networkQuality} HD</span>
                    </div>

                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleFullscreen}
                        className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full w-9 h-9"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Video Stage Container */}
            <div className="relative w-full flex-1 flex items-center justify-center p-4">
                {/* Remote Participant Screen */}
                <div className="relative w-full h-full max-w-7xl max-h-[85vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
                    {videoCall.remoteStream && !videoCall.isRemoteVideoOff ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className={`w-full h-full ${videoCall.isRemoteScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <div className="w-28 h-28 rounded-full bg-slate-800/90 border-2 border-slate-700 flex items-center justify-center shadow-inner">
                                <User className="w-14 h-14 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-medium text-white">
                                    {videoCall.callerInfo?.name || 'Participant'}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    {videoCall.callStatus === 'calling'
                                        ? 'Ringing participant...'
                                        : videoCall.callStatus === 'reconnecting'
                                        ? 'Reconnecting signal...'
                                        : 'Camera turned off'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Remote Participant Status Badges */}
                    <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white">
                        <span>{videoCall.callerInfo?.name || 'Participant'}</span>
                        {videoCall.isRemoteMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                        {videoCall.isRemoteScreenSharing && (
                            <Badge className="bg-sky-500 text-white text-[10px] py-0 px-1.5">Screen</Badge>
                        )}
                    </div>
                </div>

                {/* Local Picture-in-Picture (Self View) */}
                <div
                    className={`absolute bottom-6 right-6 z-30 transition-all duration-300 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 ${
                        isPiPMinimized ? 'w-24 h-16 opacity-70 hover:opacity-100' : 'w-48 sm:w-64 aspect-video'
                    }`}
                >
                    {videoCall.localStream && !videoCall.isVideoOff ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <User className="w-8 h-8 text-slate-400" />
                        </div>
                    )}

                    <div className="absolute bottom-2 left-2 flex items-center space-x-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] text-white">
                        <span>You</span>
                        {videoCall.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                        {videoCall.isScreenSharing && (
                            <Badge className="bg-sky-500 text-white text-[9px] py-0 px-1">Sharing</Badge>
                        )}
                    </div>

                    <button
                        onClick={() => setIsPiPMinimized(!isPiPMinimized)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-black/80 rounded text-slate-300 hover:text-white"
                        title={isPiPMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isPiPMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Bottom Glassmorphic Control Dock */}
            <div className="w-full px-6 py-6 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20">
                <div className="flex items-center space-x-3 sm:space-x-4 bg-slate-900/90 border border-slate-700/60 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl">
                    {/* Microphone Toggle */}
                    <button
                        onClick={toggleMute}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 ${
                            videoCall.isMuted
                                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white'
                        }`}
                        title={videoCall.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                        {videoCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* Camera Toggle */}
                    <button
                        onClick={toggleVideo}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 ${
                            videoCall.isVideoOff
                                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white'
                        }`}
                        title={videoCall.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {videoCall.isVideoOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </button>

                    {/* Screen Sharing Toggle */}
                    <button
                        onClick={toggleScreenShare}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 ${
                            videoCall.isScreenSharing
                                ? 'bg-sky-500 text-white border border-sky-400 shadow-lg shadow-sky-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white'
                        }`}
                        title={videoCall.isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen / Document'}
                    >
                        {videoCall.isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </button>

                    {/* Flip Camera */}
                    <button
                        onClick={flipCamera}
                        className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-105"
                        title="Flip / Switch Camera"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <div className="w-px h-8 bg-slate-700/80 mx-1" />

                    {/* End Call Button */}
                    <button
                        onClick={endCall}
                        className="w-14 h-12 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-600/40"
                        title="End Consultation Call"
                    >
                        <PhoneOff className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
