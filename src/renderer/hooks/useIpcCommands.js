import { useEffect } from "react";

const { ipcRenderer } = window.require?.("electron") || {};

export function useIpcCommands({ onRefresh, onRestart }) {
  useEffect(() => {
    if (!ipcRenderer) return;

    const handler = (_, command) => {
      if (command === "refresh") onRefresh?.();
      if (command === "restart") onRestart?.();
    };

    ipcRenderer.on("app-command", handler);
    return () => ipcRenderer.removeListener("app-command", handler);
  }, [onRefresh, onRestart]);
}
