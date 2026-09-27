"use client";

import { useEffect, useRef } from "react";

interface Props {
  onScan: (value: string) => void;
}

export default function QRScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);

  const scanningRef = useRef(false);
  const processingRef = useRef(false);

  const resumeTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Always keep the latest callback without restarting the scanner.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;

    async function startScanner() {
      try {
        if (!("BarcodeDetector" in window)) {
          console.error("BarcodeDetector is not supported in this browser.");
          return;
        }

        const BarcodeDetectorClass = (
          window as typeof window & {
            BarcodeDetector: new (options?: {
              formats?: string[];
            }) => {
              detect(
                source: HTMLVideoElement
              ): Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;

        const detector = new BarcodeDetectorClass({
          formats: ["qr_code"],
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
        });

        if (!mounted || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        if (!mounted) return;

        scanningRef.current = true;

        async function scan() {
          if (!mounted || !scanningRef.current || !videoRef.current) {
            return;
          }

          try {
            const barcodes = await detector.detect(videoRef.current);

            if (
              !processingRef.current &&
              barcodes.length > 0 &&
              barcodes[0].rawValue
            ) {
              const value = barcodes[0].rawValue;

              // Stop scanning immediately so the same QR
              // cannot trigger multiple requests.
              processingRef.current = true;
              scanningRef.current = false;

              console.log("QR SCANNED:", value);

              onScanRef.current(value);

              // Give the UI/API a moment before allowing another scan.
              resumeTimeoutRef.current = window.setTimeout(() => {
                if (!mounted) return;

                processingRef.current = false;
                scanningRef.current = true;

                animationFrameRef.current =
                  requestAnimationFrame(scan);
              }, 2000);

              return;
            }
          } catch (error) {
            console.error("QR detection error:", error);
          }

          if (mounted && scanningRef.current) {
            animationFrameRef.current =
              requestAnimationFrame(scan);
          }
        }

        scan();
      } catch (error) {
        console.error("Camera error:", error);
      }
    }

    startScanner();

    return () => {
      mounted = false;

      scanningRef.current = false;
      processingRef.current = false;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
      }

      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video object-cover"
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 border-2 border-white rounded-xl" />
      </div>
    </div>
  );
}