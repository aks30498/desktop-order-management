import { useEffect, useRef, useState } from "react";

const { ipcRenderer } = window.require?.("electron") || {};

export function useAppRuntime() {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fatalError, setFatalError] = useState(null);

  const lastErrorTimeRef = useRef(0);

  // ----------------------
  // Barcode loader
  // ----------------------
  const loadBarcodeLibrary = () => {
    return new Promise((resolve) => {
      if (window.JsBarcode) return resolve();

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";

      script.onload = () => {
        console.log("Barcode library loaded");
        resolve();
      };

      script.onerror = () => {
        console.warn("Barcode CDN failed — using fallback");

        window.JsBarcode = function (element, value) {
          if (element.tagName === "CANVAS") {
            const ctx = element.getContext("2d");
            element.width = 200;
            element.height = 60;
            ctx.fillStyle = "#f9f9f9";
            ctx.fillRect(0, 0, 200, 60);
            ctx.fillStyle = "#666";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.fillText("Barcode (Offline)", 100, 25);
            ctx.fillText(value, 100, 45);
          }
        };

        resolve();
      };

      document.head.appendChild(script);
    });
  };

  // ----------------------
  // Error handling
  // ----------------------
  const handleError = (error, context = "App") => {
    console.error(`${context} error:`, error);

    const now = Date.now();
    if (now - lastErrorTimeRef.current > 5000) {
      window.notifications?.error(`${context}: ${error.message}`);
      lastErrorTimeRef.current = now;
    }

    ipcRenderer?.send?.("log-error", {
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  };

  // ----------------------
  // Init lifecycle
  // ----------------------
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        console.log("Initializing App...");

        await loadBarcodeLibrary();

        if (!mounted) return;
        setIsReady(true);

        console.log("App initialized");
      } catch (err) {
        console.error("Initialization failed", err);
        setFatalError(err);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // ----------------------
  // Global errors
  // ----------------------
  useEffect(() => {
    const onError = (e) => handleError(e.error, "Global");
    const onRejection = (e) => handleError(e.reason, "Promise");

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    ipcRenderer?.on?.("error", (_, error) => {
      handleError(new Error(error), "IPC");
    });

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // ----------------------
  // Online / Offline
  // ----------------------
  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      window.notifications?.success("Connection restored");
    };

    const offline = () => {
      setIsOnline(false);
      window.notifications?.warning("Connection lost - working offline");
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  return {
    isReady,
    isOnline,
    fatalError,
  };
}
