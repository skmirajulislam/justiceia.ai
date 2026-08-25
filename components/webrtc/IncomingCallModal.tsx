'use client';

import React from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Video, Phone, PhoneOff, User, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const IncomingCallModal: React.FC = () => {
    const { incomingCall, acceptCall, rejectCall } = useWebRTC();

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm overflow-hidden bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-center">
                {/* Glowing Background Radial */}
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />

                {/* Animated Pulsing Avatar Rings */}
                <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute w-28 h-28 rounded-full bg-sky-500/20 animate-ping opacity-75" />
                    <div className="absolute w-24 h-24 rounded-full bg-sky-500/30 animate-pulse" />
                    <div className="relative w-20 h-20 rounded-full bg-slate-800 border-2 border-sky-400 flex items-center justify-center shadow-lg text-sky-300 font-bold text-2xl">
                        {incomingCall.fromName ? incomingCall.fromName.charAt(0).toUpperCase() : <User className="w-8 h-8 text-sky-400" />}
                    </div>
                </div>

                {/* Caller Information */}
                <div className="space-y-1 mb-6">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-sky-400 font-semibold tracking-wide uppercase">
                        <Scale className="w-3.5 h-3.5" />
                        <span>Incoming Legal Consultation</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                        {incomingCall.fromName || 'Advocate / Client'}
                    </h3>
                    {incomingCall.fromRole && (
                        <Badge variant="outline" className="text-xs bg-slate-800/80 text-slate-300 border-slate-700">
                            {incomingCall.fromRole}
                        </Badge>
                    )}
                    <p className="text-xs text-slate-400 pt-1 animate-pulse">
                        Ringing...
                    </p>
                </div>

                {/* Call Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Decline Button */}
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => rejectCall()}
                        className="h-12 bg-red-600/90 hover:bg-red-600 text-white rounded-xl font-medium flex items-center justify-center space-x-2 shadow-lg shadow-red-600/20 transition-transform active:scale-95"
                    >
                        <PhoneOff className="w-4 h-4" />
                        <span>Decline</span>
                    </Button>

                    {/* Accept with Video Button */}
                    <Button
                        type="button"
                        onClick={() => acceptCall(true)}
                        className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
                    >
                        <Video className="w-4 h-4" />
                        <span>Accept Video</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
