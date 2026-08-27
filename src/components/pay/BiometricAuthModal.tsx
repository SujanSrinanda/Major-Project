import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, CheckCircle2, AlertCircle, X, Scan, Lock, Sparkles, RefreshCw } from 'lucide-react';
import { NeoButton } from '../common/NeoButton';

interface BiometricAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  recipientName: string;
}

export const BiometricAuthModal: React.FC<BiometricAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  amount,
  recipientName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStage, setScanStage] = useState<string>('Ready for Biometric Face Scan');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetState();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setHasCameraAccess(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
        setHasCameraAccess(true);
      } else {
        throw new Error('Camera API not supported on this device/browser context.');
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCameraAccess(false);
      setCameraError(
        err?.message || 'Unable to access camera. You can still test with simulated face biometric scan.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const resetState = () => {
    setIsScanning(false);
    setScanProgress(0);
    setScanStage('Ready for Biometric Face Scan');
    setIsSuccess(false);
  };

  const startBiometricScan = () => {
    if (isScanning || isSuccess) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanStage('Initializing Camera & Frame Buffer...');

    const stages = [
      { progress: 20, text: 'Detecting Facial Landmarks...' },
      { progress: 45, text: 'Analyzing Liveness & Depth Map...' },
      { progress: 75, text: 'Matching Sentinel Cryptographic Key...' },
      { progress: 95, text: 'Verifying Identity Match...' },
      { progress: 100, text: 'Biometric Match Confirmed! 100%' },
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < stages.length) {
        const step = stages[currentStep];
        setScanProgress(step.progress);
        setScanStage(step.text);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsScanning(false);
        setIsSuccess(true);

        // Auto trigger success callback after brief delay
        setTimeout(() => {
          onSuccess();
        }, 900);
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black p-6 neo-shadow-xl max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isScanning}
          className="absolute top-4 right-4 p-1 font-black text-black hover:text-[#7C3AED] transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scan className="w-6 h-6 text-[#7C3AED]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
              Biometric Authorization
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase text-black tracking-tight">
            Face ID Verification
          </h2>
          <p className="text-xs font-bold text-black/70">
            Authorize ₹{amount.toLocaleString('en-IN')} payment to{' '}
            <span className="text-[#7C3AED]">{recipientName}</span>
          </p>
        </div>

        {/* Viewfinder / Camera Screen */}
        <div className="relative bg-black rounded-lg border-2 border-black overflow-hidden aspect-4/3 flex items-center justify-center neo-shadow-sm">
          {hasCameraAccess ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            /* Simulated Face Contour Graphic when camera is disabled/simulated */
            <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center p-6 text-center text-white relative">
              <div className="w-32 h-32 border-2 border-dashed border-[#7C3AED] rounded-full flex items-center justify-center relative my-2">
                <div className="w-24 h-24 border border-white/30 rounded-full flex items-center justify-center">
                  <Scan className="w-12 h-12 text-[#7C3AED] animate-pulse" />
                </div>
              </div>
              <p className="text-xs font-bold text-gray-300">
                {cameraError ? 'Simulated Biometric Camera Feed' : 'Accessing Camera API...'}
              </p>
            </div>
          )}

          {/* Biometric Scanning Overlay Elements */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
            {/* Corner Framing Brackets */}
            <div className="flex justify-between">
              <div className="w-8 h-8 border-t-4 border-l-4 border-[#7C3AED]" />
              <div className="w-8 h-8 border-t-4 border-r-4 border-[#7C3AED]" />
            </div>

            {/* Scanning Laser Beam */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-[#7C3AED] shadow-[0_0_15px_#7C3AED] animate-pulse transition-all duration-300 top-1/2 -translate-y-1/2" />
            )}

            {/* Face Oval Reticle Target */}
            <div className="absolute inset-8 border-2 border-white/40 rounded-[40%] flex items-center justify-center pointer-events-none">
              {isScanning && (
                <div className="w-full h-full border-2 border-[#7C3AED] rounded-[40%] animate-ping opacity-30" />
              )}
            </div>

            {/* Bottom Corner Framing Brackets */}
            <div className="flex justify-between">
              <div className="w-8 h-8 border-b-4 border-l-4 border-[#7C3AED]" />
              <div className="w-8 h-8 border-b-4 border-r-4 border-[#7C3AED]" />
            </div>
          </div>

          {/* Success Overlay Indicator */}
          {isSuccess && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center mb-2 neo-shadow">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <span className="font-black text-lg uppercase tracking-wider text-emerald-300">
                Identity Verified
              </span>
              <span className="text-xs font-bold text-white/90">Authorizing Payment...</span>
            </div>
          )}
        </div>

        {/* Progress & Stage Description */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-black uppercase text-black">
            <span className="truncate pr-2">{scanStage}</span>
            <span className="text-[#7C3AED] font-mono shrink-0">{scanProgress}%</span>
          </div>

          <div className="w-full bg-gray-200 border-2 border-black h-4 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-[#7C3AED] h-full rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2">
          {!isSuccess && (
            <NeoButton
              variant="primary"
              size="lg"
              disabled={isScanning}
              onClick={startBiometricScan}
              className="w-full uppercase text-base"
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scanning Face Biometrics...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  Scan Face & Authorize ₹{amount.toLocaleString('en-IN')}
                </span>
              )}
            </NeoButton>
          )}

          {cameraError && !hasCameraAccess && (
            <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 p-2 rounded text-center">
              💡 Camera access notice: {cameraError}. You can click "Scan Face & Authorize" to perform simulated face biometrics.
            </p>
          )}

          <NeoButton
            variant="secondary"
            size="sm"
            disabled={isScanning}
            onClick={onClose}
            className="w-full uppercase text-xs"
          >
            Cancel Payment
          </NeoButton>
        </div>
      </div>
    </div>
  );
};
