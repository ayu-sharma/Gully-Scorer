"use client";

import { useEffect, useState } from "react";

import { sync } from "@/services/sync";

/** Track browser connectivity and flush the Airtable sync queue on reconnect. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    const onOnline = () => {
      setOnline(true);
      void sync.flush();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}
