import { useEffect, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { realtimeUrl } from "@/lib/api";

type RealtimeState = "connecting" | "connected" | "disconnected";

type RealtimeEvent = {
  type: string;
  payload?: Record<string, unknown>;
  happened_at?: string;
};

export function useRealtime(queryClient: QueryClient) {
  const [state, setState] = useState<RealtimeState>("connecting");
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    let closedByReact = false;

    function invalidate(event: RealtimeEvent) {
      setLastEvent(event);
      if (event.type === "camera.scan.progress") {
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["summary"] });

      if (event.type.startsWith("passenger.")) {
        queryClient.invalidateQueries({ queryKey: ["passengers"] });
        const passengerId = event.payload?.passenger_id;
        if (typeof passengerId === "number") {
          queryClient.invalidateQueries({ queryKey: ["captures", passengerId] });
        }
      }

      if (event.type.startsWith("alert.") || event.type.startsWith("camera.") || event.type.startsWith("bus.")) {
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["buses"] });
      }
    }

    function scheduleReconnect() {
      if (closedByReact || retryRef.current !== null) return;
      retryRef.current = window.setTimeout(() => {
        retryRef.current = null;
        connect();
      }, 1500);
    }

    function connect() {
      setState("connecting");
      const socket = new WebSocket(realtimeUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        setState("connected");
        socket.send("ping");
      };

      socket.onmessage = (message) => {
        try {
          invalidate(JSON.parse(message.data) as RealtimeEvent);
        } catch {
          setLastEvent({ type: "connection.message", payload: { raw: message.data } });
        }
      };

      socket.onclose = () => {
        setState("disconnected");
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      closedByReact = true;
      if (retryRef.current !== null) {
        window.clearTimeout(retryRef.current);
      }
      socketRef.current?.close();
    };
  }, [queryClient]);

  return { state, lastEvent };
}
