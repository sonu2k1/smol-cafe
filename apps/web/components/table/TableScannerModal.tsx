"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TABLE_ZONES_CONFIG } from "@/lib/table-tag";
import { QrCode, Camera, Check, X, MapPin, RefreshCw, Sparkles, Upload } from "lucide-react";
import jsQR from "jsqr";

interface TableScannerModalProps {
  currentTable: string;
  onClose: () => void;
  onSelectTable: (tableLabel: string) => void;
  initialTab?: "camera" | "picker";
}

export const TableScannerModal: React.FC<TableScannerModalProps> = ({
  currentTable,
  onClose,
  onSelectTable,
  initialTab = "camera",
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "picker">(initialTab);
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

  const tableList = Array.from({ length: 12 }, (_, i) => {
    const label = (i + 1).toString().padStart(2, "0");
    const info = TABLE_ZONES_CONFIG[label] || { zone: "Indoor Cozy", capacity: 2 };
    return {
      label,
      zone: info.zone,
      capacity: info.capacity,
    };
  });

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

  // Parse QR string to table code (e.g., "table-04", "T-04", "04", "https://.../t/table-04")
  const parseTableFromQR = (rawText: string): string | null => {
    if (!rawText) return null;
    const clean = rawText.trim();
    const match = clean.match(/table[-_]?([0-9]{1,2})/i) || clean.match(/\bT?([0-9]{1,2})\b/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 12) {
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

      // Automatically connect and route after brief success feedback
      setTimeout(() => {
        stopCamera();
        onSelectTable(tableLabel);
      }, 750);
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
          : "Mobile browsers require HTTPS or native photo capture for camera access."
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
        // Fallback: simple video constraint without facingMode (essential for some Android/iOS devices)
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
        setErrorMessage("Camera permission was denied. Tap 'Snap Table QR' to use native phone camera or select your table below.");
      } else {
        setCameraState("error");
        setErrorMessage(error?.message || "Could not start camera stream.");
      }
    }
  }, [facingMode, isSecureContextEnv, stopCamera, tickScan]);

  // Activate / deactivate camera depending on activeTab
  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera]);

  // Handle Photo Snap / Upload from Native Phone Camera (100% works on all phones & HTTP/IP)
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
        // Limit max dimensions for fast decoding on high-megapixel mobile phones
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
        setErrorMessage("QR code was not clearly detected in the photo. Please tap closer to the QR stand or select your table.");
      };
      img.onerror = () => {
        setCameraState("error");
        setErrorMessage("Could not read image file.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSimulateScan = (label: string) => {
    handleTableDetected(label);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#241F1C]/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      {/* Hidden processing canvas for QR decoder */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden native mobile camera input (Always triggers native camera on iOS & Android) */}
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
        className="w-full max-w-md rounded-3xl sm:rounded-[2rem] border border-[#725039]/20 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#1E1916] p-4 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] text-[#241F1C] dark:text-[#F3E7D3] transition-all animate-scale-in max-h-[92vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#725039]/15 dark:border-white/10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border border-[#B72E35]/30 bg-[#B72E35]/10 dark:border-[#754CFF]/40 dark:bg-[#754CFF]/20 shadow-sm">
              <QrCode className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#B72E35] dark:text-[#9D7BFF]" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-medium tracking-tight text-[#241F1C] dark:text-[#F3E7D3] lowercase">
                select your table
              </h3>
              <p className="font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B]">
                tap your table or scan the qr stand
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

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-[#EFE3D3] dark:bg-[#161210] p-1 text-xs font-medium my-3 sm:my-4 border border-[#725039]/15 dark:border-white/10">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 sm:py-2.5 transition-all font-sans cursor-pointer ${
              activeTab === "camera"
                ? "bg-[#FAF4EB] dark:bg-[#2A2420] font-semibold text-[#B72E35] dark:text-[#9D7BFF] shadow-sm border border-[#725039]/15 dark:border-[#754CFF]/30"
                : "text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] border border-transparent"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            scan qr (camera)
          </button>
          <button
            onClick={() => setActiveTab("picker")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 sm:py-2.5 transition-all font-sans cursor-pointer ${
              activeTab === "picker"
                ? "bg-[#FAF4EB] dark:bg-[#2A2420] font-semibold text-[#B72E35] dark:text-[#9D7BFF] shadow-sm border border-[#725039]/15 dark:border-[#754CFF]/30"
                : "text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] border border-transparent"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            select table
          </button>
        </div>

        {/* Tab 1: Live Camera Scanner */}
        {activeTab === "camera" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#725039]/20 bg-[#161210] text-white text-center relative overflow-hidden flex-1 min-h-[320px] sm:min-h-[350px]">
            {/* Native Mobile Camera File Input (Triggered via native <label>) */}
            <input
              id="phone-camera-input-file"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageFile}
              className="sr-only opacity-0 absolute pointer-events-none w-0 h-0"
            />

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

                  {/* Animated Laser Beam sweeping bottom to top */}
                  <div className="absolute inset-x-2 h-[2.5px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#FF5B52] dark:via-[#B89EFF] to-transparent shadow-[0_0_12px_#FF5B52,0_0_4px_#FFA8A3] dark:shadow-[0_0_14px_#754CFF,0_0_6px_#D6C4FF] animate-laser-scan pointer-events-none" />

                  {/* Center target indicator */}
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-white/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-[#B72E35] dark:bg-[#9D7BFF] animate-ping opacity-75" />
                  </div>
                </div>

                {/* Camera Active Controls Bar */}
                <div className="relative z-10 w-full px-3 sm:px-4 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs border border-white/10 text-[10.5px] text-[#C9AE8B]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>scanning table qr...</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Snap photo directly"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs border border-white/10 text-[10.5px] text-[#C9AE8B] hover:text-white transition cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      title="Flip camera"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs border border-white/10 text-[10.5px] text-[#C9AE8B] hover:text-white transition cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>flip</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* When Camera is Not Active (Mobile on HTTP, user gesture needed, or initial state) */}
            {cameraState !== "active" && (
              <div className="relative z-10 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-sm w-full">
                {/* Viewfinder Preview Box */}
                <div className="relative h-36 w-36 sm:h-40 sm:w-40 flex items-center justify-center mb-3">
                  <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-[#B72E35] dark:border-[#754CFF] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-[#B72E35] dark:border-[#754CFF] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#B72E35] dark:border-[#754CFF] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#B72E35] dark:border-[#754CFF] rounded-br-lg" />
                  <div className="absolute inset-x-2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#B72E35] dark:via-[#B89EFF] to-transparent animate-laser-scan" />
                  <QrCode className="h-14 w-14 text-[#C9AE8B]/30" />
                </div>

                {errorMessage ? (
                  <p className="text-xs text-[#FF6358] mb-3 max-w-xs leading-relaxed">
                    {errorMessage}
                  </p>
                ) : (
                  <p className="font-serif italic text-xs text-[#C9AE8B] mb-3">
                    point your phone camera at the table qr stand
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

                  {/* Secondary Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#FAF4EB] text-xs font-medium transition cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Live Stream</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("picker")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#FAF4EB] text-xs font-medium transition cursor-pointer"
                    >
                      <MapPin className="h-3 w-3 text-[#B72E35]" />
                      <span>Select Table</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Demo Scan Fallback Chips */}
            <div className="relative z-10 mt-2.5 w-full border-t border-white/10 pt-2 px-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-[#F2C84B]" />
                <span className="font-mono text-[9px] text-[#C9AE8B]/80 uppercase tracking-wider">
                  one-click instant test
                </span>
              </div>
              <div className="flex justify-center gap-1.5 sm:gap-2">
                {["01", "04", "07", "12"].map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => handleSimulateScan(lbl)}
                    className="rounded-xl border border-[#725039]/40 bg-[#241F1C]/80 px-2.5 sm:px-3 py-1 font-mono text-xs font-medium text-[#FAF4EB] hover:border-[#B72E35] hover:text-[#B72E35] transition active:scale-95 cursor-pointer"
                  >
                    T-{lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan Success Overlay */}
            {scannedTable && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#241F1C]/95 gap-2 animate-fade-in">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#75AFA7]/20 border border-[#75AFA7] shadow-[0_0_15px_#75AFA7]">
                  <Check className="h-6 w-6 text-[#75AFA7]" />
                </div>
                <span className="font-serif font-medium text-[#FAF4EB] text-base">
                  table {scannedTable} connected
                </span>
                <span className="text-xs text-[#75AFA7] font-mono animate-pulse">
                  loading artisanal menu...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 12 Table Grid */}
        {activeTab === "picker" && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0 -mr-1" style={{ maxHeight: "calc(90vh - 220px)" }}>
            <p className="font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B] px-0.5">
              tap the table stand number at your seat
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {tableList.map((t) => {
                const isSelected = currentTable === t.label;
                return (
                  <button
                    key={t.label}
                    onClick={() => {
                      stopCamera();
                      onSelectTable(t.label);
                    }}
                    className={`group relative flex flex-col items-center rounded-2xl border p-3 text-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-[#B72E35] bg-[#B72E35]/10 dark:bg-[#B72E35]/20 shadow-sm ring-1 ring-[#B72E35]/30"
                        : "border-[#725039]/15 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#1A1613] hover:border-[#B72E35]/40 hover:bg-white dark:hover:bg-[#25201C] active:scale-[0.97]"
                    }`}
                  >
                    {/* Table Number */}
                    <div className="flex items-center gap-1">
                      <span className={`font-mono text-base font-bold ${isSelected ? "text-[#B72E35]" : "text-[#241F1C] dark:text-[#F3E7D3]"}`}>
                        T-{t.label}
                      </span>
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B72E35] text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    {/* Zone */}
                    <span className={`mt-1 text-[10px] font-medium leading-tight ${isSelected ? "text-[#B72E35]" : "text-[#725039] dark:text-[#C9AE8B]"}`}>
                      {t.zone}
                    </span>
                    {/* Capacity */}
                    <span className="mt-0.5 text-[9px] text-[#C9AE8B] font-mono">
                      {t.capacity} seats
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-[#725039]/15 dark:border-white/10 pt-2.5 sm:pt-3 text-[10px]">
          <div className="flex items-center gap-1.5 text-[#725039] dark:text-[#C9AE8B]">
            <MapPin className="h-3 w-3 text-[#B72E35]" />
            <span className="font-serif italic">tapovan, rishikesh</span>
          </div>
          <span className="font-mono text-[9px] text-[#C9AE8B]">
            current table: {currentTable}
          </span>
        </div>
      </div>
    </div>
  );
};


