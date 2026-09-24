"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Camera, Check, X, MapPin, RefreshCw, Upload, AlertCircle } from "lucide-react";
import jsQR from "jsqr";

interface TableScannerModalProps {
  currentTable: string;
  onClose: () => void;
  onSelectTable: (tableLabel: string) => void;
}

export const TableScannerModal: React.FC<TableScannerModalProps> = ({
  currentTable,
  onClose,
  onSelectTable,
}) => {
  const [cameraState, setCameraState] = useState<
    "idle" | "requesting" | "needs_tap" | "active" | "denied" | "unsupported" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scannedTable, setScannedTable] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isSecureContextEnv, setIsSecureContextEnv] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const scanLockRef = useRef<boolean>(false);

  // Check secure context for mobile browsers (iOS & Android require HTTPS for getUserMedia)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const isSecure = window.isSecureContext || isLocalhost;
      setIsSecureContextEnv(isSecure);
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Parse QR string to table code (e.g., "table-04", "T-04", "04", "https://.../t/table-13")
  const parseTableFromQR = (rawText: string): string | null => {
    if (!rawText) return null;
    const clean = rawText.trim();
    const match = clean.match(/table[-_]?([0-9]{1,3})/i) || clean.match(/\bT?([0-9]{1,3})\b/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 999) {
        return num.toString().padStart(2, "0");
      }
    }
    return null;
  };

  const handleTableDetected = useCallback(
    (tableLabel: string) => {
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      setScannedTable(tableLabel);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {
          // ignore vibration errors
        }
      }

      // Automatically connect and route immediately after snappy haptic feedback
      setTimeout(() => {
        stopCamera();
        onSelectTable(tableLabel);
      }, 300);
    },
    [onSelectTable, stopCamera]
  );

  // Frame scanner loop
  const tickScan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || scanLockRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          const detected = parseTableFromQR(code.data);
          if (detected) {
            handleTableDetected(detected);
            return;
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(tickScan);
  }, [handleTableDetected]);

  // Start real browser camera with mobile compatibility
  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      setErrorMessage(
        isSecureContextEnv
          ? "Camera is not supported on this browser."
          : "Mobile browsers require HTTPS or native camera capture."
      );
      return;
    }

    stopCamera();
    scanLockRef.current = false;
    setCameraState("requesting");
    setErrorMessage("");

    try {
      let stream: MediaStream | null = null;
      try {
        // Preferred: rear/environment camera on mobile phones
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback: simple video constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");

        try {
          await videoRef.current.play();
          setCameraState("active");
          animFrameIdRef.current = requestAnimationFrame(tickScan);
        } catch (playErr) {
          console.warn("Video play was prevented (user gesture needed):", playErr);
          setCameraState("needs_tap");
        }
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      console.warn("Camera access request error:", error);
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        setCameraState("denied");
        setErrorMessage("Camera permission was denied. Tap 'Open Phone Camera to Scan' to use native phone camera.");
      } else {
        setCameraState("error");
        setErrorMessage(error?.message || "Could not start camera stream.");
      }
    }
  }, [facingMode, isSecureContextEnv, stopCamera, tickScan]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle Photo Snap / Upload from Native Phone Camera
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraState("requesting");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code && code.data) {
            const detected = parseTableFromQR(code.data);
            if (detected) {
              handleTableDetected(detected);
              return;
            }
          }
        }
        setCameraState("error");
        setErrorMessage("QR code was not clearly detected in the photo. Please point closer to the table QR code stand.");
      };
      img.onerror = () => {
        setCameraState("error");
        setErrorMessage("Could not read image file.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#241F1C]/85 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      {/* Hidden processing canvas for QR decoder */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden native mobile camera input */}
      <input
        ref={fileInputRef}
        id="phone-camera-input-file"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFile}
        className="hidden"
      />

      <div
        className="w-full max-w-md rounded-3xl sm:rounded-[2rem] border border-[#725039]/20 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#1E1916] p-4 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] text-[#241F1C] dark:text-[#F3E7D3] transition-all animate-scale-in overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#725039]/15 dark:border-white/10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border border-[#B72E35]/30 bg-[#B72E35]/10 dark:border-[#754CFF]/40 dark:bg-[#754CFF]/20 shadow-sm">
              <QrCode className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#B72E35] dark:text-[#9D7BFF]" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#241F1C] dark:text-[#F3E7D3]">
                Scan Table QR
              </h3>
              <p className="font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B]">
                Point camera at your seat&apos;s QR stand
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#725039]/20 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#171311] text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] hover:border-[#B72E35]/40 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Camera Scanner Viewport */}
        <div className="my-3 sm:my-4 flex flex-col items-center justify-center rounded-2xl border border-[#725039]/20 bg-[#161210] text-white text-center relative overflow-hidden min-h-[330px] sm:min-h-[360px]">
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              cameraState === "active" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />

          {/* Active Live Video Stream View */}
          {cameraState === "active" && (
            <>
              <div className="relative z-10 h-48 w-48 sm:h-56 sm:w-56 flex items-center justify-center pointer-events-none">
                {/* 4 Corner brackets */}
                <div className="absolute top-0 left-0 h-7 w-7 sm:h-8 sm:w-8 border-t-3 border-l-3 border-[#B72E35] dark:border-[#754CFF] rounded-tl-xl shadow-[0_0_8px_#B72E35] dark:shadow-[0_0_12px_#754CFF]" />
                <div className="absolute top-0 right-0 h-7 w-7 sm:h-8 sm:w-8 border-t-3 border-r-3 border-[#B72E35] dark:border-[#754CFF] rounded-tr-xl shadow-[0_0_8px_#B72E35] dark:shadow-[0_0_12px_#754CFF]" />
                <div className="absolute bottom-0 left-0 h-7 w-7 sm:h-8 sm:w-8 border-b-3 border-l-3 border-[#B72E35] dark:border-[#754CFF] rounded-bl-xl shadow-[0_0_8px_#B72E35] dark:shadow-[0_0_12px_#754CFF]" />
                <div className="absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 border-b-3 border-r-3 border-[#B72E35] dark:border-[#754CFF] rounded-br-xl shadow-[0_0_8px_#B72E35] dark:shadow-[0_0_12px_#754CFF]" />

                {/* Animated Laser Beam */}
                <div className="absolute inset-x-2 h-[2.5px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#FF5B52] dark:via-[#B89EFF] to-transparent shadow-[0_0_12px_#FF5B52] dark:shadow-[0_0_14px_#754CFF] animate-laser-scan pointer-events-none" />

                {/* Center target indicator */}
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-white/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#B72E35] dark:bg-[#9D7BFF] animate-ping opacity-75" />
                </div>
              </div>

              {/* Camera Active Controls Bar */}
              <div className="relative z-10 w-full px-3 sm:px-4 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-[10.5px] text-[#C9AE8B]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Scanning table QR...</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Snap photo directly"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-[10.5px] text-[#C9AE8B] hover:text-white transition cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Upload QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    title="Flip camera"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-[10.5px] text-[#C9AE8B] hover:text-white transition cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Flip</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* When Camera is Not Active */}
          {cameraState !== "active" && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-sm w-full">
              <div className="relative h-36 w-36 sm:h-40 sm:w-40 flex items-center justify-center mb-3">
                <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-[#B72E35] dark:border-[#754CFF] rounded-tl-lg" />
                <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-[#B72E35] dark:border-[#754CFF] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#B72E35] dark:border-[#754CFF] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#B72E35] dark:border-[#754CFF] rounded-br-lg" />
                <div className="absolute inset-x-2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#B72E35] dark:via-[#B89EFF] to-transparent animate-laser-scan" />
                <QrCode className="h-14 w-14 text-[#C9AE8B]/30" />
              </div>

              {errorMessage ? (
                <div className="flex items-start gap-1.5 text-xs text-[#FF6358] mb-3 max-w-xs text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              ) : (
                <p className="font-serif italic text-xs text-[#C9AE8B] mb-3">
                  Point your phone camera at the QR code stand at your table.
                </p>
              )}

              {/* Primary Action: Direct Native Mobile Camera Trigger */}
              <div className="flex flex-col w-full gap-2 px-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#A5242A] via-[#B72E35] to-[#C93840] text-white text-xs sm:text-sm font-semibold shadow-[0_8px_20px_rgba(183,46,53,0.5)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
                >
                  <Camera className="h-4.5 w-4.5 shrink-0" />
                  <span>Open Phone Camera to Scan</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#FAF4EB] text-xs font-medium transition cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry Live Camera Stream</span>
                </button>
              </div>
            </div>
          )}

          {/* Scan Success Overlay */}
          {scannedTable && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#241F1C]/95 gap-2 animate-fade-in">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#75AFA7]/20 border border-[#75AFA7] shadow-[0_0_15px_#75AFA7]">
                <Check className="h-6 w-6 text-[#75AFA7]" />
              </div>
              <span className="font-serif font-medium text-[#FAF4EB] text-base">
                Table {scannedTable} Connected
              </span>
              <span className="text-xs text-[#75AFA7] font-mono animate-pulse">
                Opening artisanal menu...
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#725039]/15 dark:border-white/10 pt-2.5 sm:pt-3 text-[10px]">
          <div className="flex items-center gap-1.5 text-[#725039] dark:text-[#C9AE8B]">
            <MapPin className="h-3 w-3 text-[#B72E35]" />
            <span className="font-serif italic">Tapovan, Rishikesh</span>
          </div>
          <span className="font-mono text-[9px] text-[#C9AE8B]">
            smol café qr portal
          </span>
        </div>
      </div>
    </div>
  );
};
