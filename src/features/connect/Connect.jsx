import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_SERVER = "http://localhost:3001";

export default function Connect() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_SERVER);

    socket.on("connect", () => {
      console.log("Connected to NoteZ Connect server:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from NoteZ Connect server");
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>NoteZ Connect</h1>

      <p>
        Server status:{" "}
        <strong>
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </strong>
      </p>
    </div>
  );
}