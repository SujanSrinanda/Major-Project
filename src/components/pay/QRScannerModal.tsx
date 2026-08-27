import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  FlipHorizontal,
  Upload,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import jsQR from 'jsqr';
import { useTransactions } from '../../context/TransactionContext';
import { parseQRCodePayload, ParsedQRData } from '../../utils/qrParser';
import { RiskEvaluationRequest, RiskEvaluationResponse } from '../../types';
import { NeoButton } from '../common/NeoButton';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQR: (data: { name: string; phone: string; amount?: number }) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectQR,
}) => {
  const { evaluatePayment, confirmPayment } = useTransactions();

  // Camera & Video Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningLocked = useRef<boolean>(false);

  // States
  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'permission_denied' | 'error'>('loading');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  // Scanner Steps: 'scanning' -> 'qr_detected' -> 'evaluating' -> 'evaluated'
  const [scanStep, setScanStep] = useState<'scanning' | 'qr_detected' | 'evaluating' | 'evaluated'>('scanning');
  const [scannedQR, setScannedQR] = useState<ParsedQRData | null>(null);
  const [amountInput, setAmountInput] = useState<string>('500');
  const [noteInput, setNoteInput] = useState<string>('');

  // Risk Evaluation Output
  const [evaluation, setEvaluation] = useState<RiskEvaluationResponse | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Handle QR code found
  const handleQRCodeFound = useCallback(
    (rawText: string) => {
      if (isScanningLocked.current) return;
      isScanningLocked.current = true;

      // Stop camera stream immediately
      stopCameraStream();

      // Parse payload
      const parsed = parseQRCodePayload(rawText);
      setScannedQR(parsed);
      if (parsed.amount) {
        setAmountInput(String(parsed.amount));
      } else {
        setAmountInput('500');
      }
      if (parsed.note) {
        setNoteInput(parsed.note);
      }

      setScanStep('qr_detected');
    },
    [stopCameraStream]
  );

  // Frame scanner loop
  const scanVideoFrame = useCallback(() => {
    if (isScanningLocked.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleQRCodeFound(code.data);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleQRCodeFound]);

  // Start live camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraState('loading');
    setCameraErrorMsg('');
    isScanningLocked.current = false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setCameraErrorMsg('Camera hardware or browser API is not supported in this environment.');
        stopCameraStream();
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraState('active');

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() as any) || {};
        setTorchSupported(!!capabilities.torch);
      }

      // Begin scanning frame loop
      scanVideoFrame();
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      stopCameraStream();
      const errorName = err?.name || '';
      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'SecurityError'
      ) {
        setCameraState('permission_denied');
        setCameraErrorMsg(
          'Camera access was denied. Please allow camera permissions in your browser settings.'
        );
      } else if (
        errorName === 'NotFoundError' ||
        errorName === 'OverconstrainedError' ||
        errorName === 'DevicesNotFoundError'
      ) {
        setCameraState('error');
        setCameraErrorMsg(
          'Camera hardware was not found or requested mode is unsupported on this device.'
        );
      } else {
        setCameraState('error');
        setCameraErrorMsg(
          'Camera is unavailable or currently in use by another application.'
        );
      }
    }
  }, [facingMode, scanVideoFrame, stopCameraStream]);

  // Camera Initialization & Cleanup Hook
  useEffect(() => {
    if (isOpen && scanStep === 'scanning') {
      setScannedQR(null);
      setEvaluation(null);
      setEvaluationError(null);
      startCameraStream();
    } else if (!isOpen) {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, scanStep, startCameraStream, stopCameraStream]);

  // Close modal safely stopping camera
  const handleCloseModal = () => {
    stopCameraStream();
    onClose();
  };

  // Toggle Torch/Flash
  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const nextState = !isTorchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
    } catch {
      // Torch not supported on this track
    }
  };

  // Flip Camera Front / Back
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Gallery File Scan
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleQRCodeFound(code.data);
          } else {
            alert('No valid QR code could be detected in this image. Please select a clearer QR photo.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Run Risk Evaluation
  const handleRunSecurityCheck = async () => {
    if (!scannedQR) return;

    const numAmount = parseFloat(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    setScanStep('evaluating');
    setEvaluationError(null);

    const req: RiskEvaluationRequest = {
      recipientName: scannedQR.name,
      recipientPhone: scannedQR.phone,
      amount: numAmount,
      paymentType: 'QR',
      note: noteInput || scannedQR.note || 'Scanned QR Payment',
      isNewRecipient: true,
    };

    try {
      const result = await evaluatePayment(req);
      setEvaluation(result);
      setScanStep('evaluated');
    } catch (err) {
      console.error('SentinelFin evaluation failed:', err);
      setEvaluationError("SentinelFin couldn't complete the security check. Your payment has been paused for your protection.");
      setScanStep('evaluated');
    }
  };

  // Confirm Final Payment
  const handleFinalizePayment = async () => {
    if (!scannedQR || !evaluation) return;
    setIsSubmittingPayment(true);

    const numAmount = parseFloat(amountInput);
    const req: RiskEvaluationRequest = {
      recipientName: scannedQR.name,
      recipientPhone: scannedQR.phone,
      amount: numAmount,
      paymentType: 'QR',
      note: noteInput || scannedQR.note || 'Scanned QR Payment',
      isNewRecipient: true,
    };

    try {
      await confirmPayment(req, evaluation);
      setIsSubmittingPayment(false);
      onSelectQR({
        name: scannedQR.name,
        phone: scannedQR.phone,
        amount: numAmount,
      });
      handleCloseModal();
    } catch (err) {
      console.error('Payment confirmation error:', err);
      setIsSubmittingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-black p-5 neo-shadow-xl max-w-lg w-full space-y-4 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#7C3AED] text-white rounded border border-black neo-shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-black text-lg text-black uppercase tracking-tight">
              Scan QR Code
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Close QR scanner"
            className="p-1.5 bg-gray-100 hover:bg-purple-100 border-2 border-black rounded text-black hover:text-[#7C3AED] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Canvas & Hidden File Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleGallerySelect}
          className="hidden"
        />

        {/* STEP 1: SCANNING VIEWPORT */}
        {scanStep === 'scanning' && (
          <div className="space-y-4 overflow-y-auto">
            {cameraState === 'active' || cameraState === 'loading' ? (
              <div className="relative bg-black rounded-lg border-2 border-black overflow-hidden h-64 sm:h-72 flex items-center justify-center">
                {/* Live Camera Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Loading Spinner overlay */}
                {cameraState === 'loading' && (
                  <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 text-white">
                    <RefreshCw className="w-8 h-8 text-[#7C3AED] animate-spin" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Accessing Camera...
                    </span>
                  </div>
                )}

                {/* Visual Scanning Frame & Corner Brackets */}
                <div className="absolute inset-8 sm:inset-10 border-2 border-transparent pointer-events-none flex flex-col justify-between p-2">
                  {/* Top corners */}
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-[#7C3AED] rounded-tl-sm neo-shadow-sm" />
                    <div className="w-8 h-8 border-t-4 border-r-4 border-[#7C3AED] rounded-tr-sm neo-shadow-sm" />
                  </div>

                  {/* Animated Purple Laser Scanning Line */}
                  <div className="w-full h-1 bg-[#7C3AED] shadow-[0_0_12px_#7C3AED] animate-scan-line rounded-full" />

                  {/* Bottom corners */}
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-[#7C3AED] rounded-bl-sm neo-shadow-sm" />
                    <div className="w-8 h-8 border-b-4 border-r-4 border-[#7C3AED] rounded-br-sm neo-shadow-sm" />
                  </div>
                </div>

                <span className="absolute bottom-3 text-[11px] font-black uppercase text-white bg-black/80 px-3 py-1 rounded-full border border-white/20 tracking-wider">
                  Position the QR code inside the frame
                </span>
              </div>
            ) : (
              /* Camera Permission Denied / Unavailable Screen */
              <div className="bg-[#FAF7F2] border-2 border-black p-6 rounded-lg space-y-4 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 border-2 border-black rounded-full neo-shadow flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-base uppercase text-black">
                    Camera Access Required
                  </h4>
                  <p className="text-xs font-bold text-black/70 mt-1 leading-relaxed">
                    {cameraErrorMsg || 'Camera access is required to scan QR codes directly.'}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="w-full py-2.5 bg-[#7C3AED] text-white text-xs font-black uppercase border-2 border-black rounded neo-shadow hover:bg-purple-700 cursor-pointer"
                  >
                    Allow Camera Access
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-white text-black text-xs font-black uppercase border-2 border-black rounded neo-shadow hover:bg-gray-100 cursor-pointer"
                  >
                    Select QR Image from Gallery
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full py-2 bg-transparent text-black/70 hover:text-black text-xs font-bold uppercase cursor-pointer"
                  >
                    Enter Payment Details Manually
                  </button>
                </div>
              </div>
            )}

            {/* Minimal Camera Controls Bar */}
            {cameraState === 'active' && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload QR from gallery"
                  className="px-4 py-2 bg-white text-black border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-purple-100 cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 text-[#7C3AED]" />
                  <span>Gallery</span>
                </button>

                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleFlash}
                    aria-label="Toggle flash"
                    className={`px-4 py-2 border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow cursor-pointer flex items-center gap-1.5 ${
                      isTorchOn ? 'bg-amber-400 text-black' : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {isTorchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4 text-amber-500" />}
                    <span>{isTorchOn ? 'Flash Off' : 'Flash'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  aria-label="Switch camera"
                  className="px-4 py-2 bg-white text-black border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-purple-100 cursor-pointer flex items-center gap-1.5"
                >
                  <FlipHorizontal className="w-4 h-4 text-[#7C3AED]" />
                  <span>Flip</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: QR CODE DETECTED */}
        {scanStep === 'qr_detected' && scannedQR && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-emerald-100 border-2 border-emerald-900 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-900 block">
                  Camera Scan Successful
                </span>
                <span className="text-xs font-black text-emerald-950 uppercase">
                  QR Code Detected
                </span>
              </div>
            </div>

            {/* Recipient Details Card */}
            <div className="bg-[#FAF7F2] border-2 border-black p-4 neo-shadow rounded-lg space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase text-black/60 block">Payee Recipient</span>
                <span className="text-lg font-black text-black">{scannedQR.name}</span>
                <span className="text-xs font-mono font-bold text-[#7C3AED] block">{scannedQR.phone}</span>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Payment Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-base text-black">₹</span>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border-2 border-black rounded text-base font-black text-black focus:outline-none focus:neo-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Payment Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scanned QR Payment"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-black rounded text-xs font-bold text-black focus:outline-none focus:neo-shadow"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setScanStep('scanning');
                  startCameraStream();
                }}
                className="flex-1 py-2.5 bg-white text-black border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-gray-100 cursor-pointer"
              >
                Rescan QR
              </button>
              <button
                type="button"
                onClick={handleRunSecurityCheck}
                className="flex-1 py-2.5 bg-[#7C3AED] text-white border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: EVALUATING RISK */}
        {scanStep === 'evaluating' && (
          <div className="p-8 bg-purple-50 border-2 border-black neo-shadow rounded-lg text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-[#7C3AED] animate-spin mx-auto" />
            <h4 className="font-black text-base uppercase text-black">
              Evaluating Transaction Security...
            </h4>
            <p className="text-xs font-bold text-black/70 max-w-sm mx-auto">
              SentinelFin is analyzing payment parameters against Random Forest, Isolation Forest, and Neo4j Graph threat vectors.
            </p>
          </div>
        )}

        {/* STEP 4: RISK RESULT DECISION */}
        {scanStep === 'evaluated' && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            {evaluationError ? (
              /* Security Failure / Endpoint Unavailable */
              <div className="bg-red-50 border-2 border-red-900 p-5 neo-shadow rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-red-950 font-black text-sm uppercase">
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                  <span>SentinelFin Couldn't Complete Security Check</span>
                </div>
                <p className="text-xs font-bold text-red-900 leading-snug">
                  Your payment has been paused for your protection. SentinelFin fails closed when threat evaluation cannot be guaranteed.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRunSecurityCheck}
                    className="flex-1 py-2 bg-red-600 text-white text-xs font-black uppercase border border-black rounded neo-shadow"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2 bg-white text-black text-xs font-black uppercase border border-black rounded neo-shadow"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : evaluation?.decision === 'BLOCK' ? (
              /* BLOCKED TRANSACTION - NO CONTINUE BUTTON */
              <div className="bg-red-950 text-white border-4 border-black p-5 neo-shadow-xl rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-6 h-6 text-red-400 animate-pulse" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-red-300 bg-red-900/80 px-2 py-0.5 rounded border border-red-700">
                      PAYMENT STOPPED
                    </span>
                    <h4 className="text-base font-black uppercase text-white tracking-tight mt-0.5">
                      Critical Security Risk Detected
                    </h4>
                  </div>
                </div>

                <p className="text-xs font-bold text-red-100 leading-relaxed">
                  SentinelFin blocked this transfer to <strong>{scannedQR?.name}</strong> because it matched high-threat fraudulent patterns.
                </p>

                <div className="space-y-1 bg-red-900/60 p-3 rounded border border-red-700 text-xs">
                  <span className="font-black text-white text-[10px] uppercase block">Threat Reasons:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-red-200">
                    {evaluation.humanReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full py-3 bg-white text-black font-black uppercase text-xs border-2 border-black rounded neo-shadow hover:bg-gray-100 cursor-pointer"
                >
                  Close Scanner
                </button>
              </div>
            ) : evaluation?.decision === 'CHALLENGE' ? (
              /* CHALLENGE RISK DECISION */
              <div className="bg-amber-50 border-2 border-amber-900 p-5 neo-shadow rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200 px-2 py-0.5 rounded border border-amber-800">
                      ONE MORE CHECK
                    </span>
                    <h4 className="text-base font-black uppercase text-black tracking-tight mt-0.5">
                      Verification Required
                    </h4>
                  </div>
                </div>

                <p className="text-xs font-bold text-black/80 leading-snug">
                  This transaction presents unusual parameters. Please verify you intended to pay ₹{amountInput} to {scannedQR?.name}.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 bg-white text-black border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizePayment}
                    disabled={isSubmittingPayment}
                    className="flex-1 py-2.5 bg-[#7C3AED] text-white border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-purple-700 cursor-pointer"
                  >
                    {isSubmittingPayment ? 'Authorizing...' : 'Verify & Pay'}
                  </button>
                </div>
              </div>
            ) : (
              /* ALLOWED SAFE TRANSACTION */
              <div className="bg-emerald-50 border-2 border-emerald-900 p-5 neo-shadow rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded border border-emerald-800">
                      ✓ PAYMENT LOOKS SAFE
                    </span>
                    <h4 className="text-base font-black uppercase text-black tracking-tight mt-0.5">
                      Recipient Verified
                    </h4>
                  </div>
                </div>

                <div className="bg-white p-3 border border-emerald-800 rounded text-xs space-y-1">
                  <div className="flex justify-between font-bold text-black">
                    <span>Payee:</span>
                    <span>{scannedQR?.name}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black">
                    <span>Amount:</span>
                    <span className="text-base font-black text-[#7C3AED]">₹{amountInput}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-black/60 font-semibold">
                    <span>Safety Score:</span>
                    <span>{evaluation?.safetyScore || 92} / 100</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinalizePayment}
                  disabled={isSubmittingPayment}
                  className="w-full py-3 bg-[#7C3AED] text-white font-black uppercase text-xs border-2 border-black rounded-lg neo-shadow hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingPayment ? 'Processing Payment...' : 'Confirm & Complete Payment →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
