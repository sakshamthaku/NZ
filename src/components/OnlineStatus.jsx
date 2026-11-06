import React from "react";

const OnlineStatus = ({ isOnline, lastSeen }) => {
  return (
    <div className="d-flex align-items-center gap-2">
      <span 
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: isOnline ? "#22c55e" : "#64748b",
          display: "inline-block"
        }}
      />
      <small className="text-muted">
        {isOnline 
          ? "Online" 
          : lastSeen 
            ? `Last seen ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
            : "Offline"}
      </small>
    </div>
  );
};

export default OnlineStatus;