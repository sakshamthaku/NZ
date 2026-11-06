import React from "react";

const TypingIndicator = () => {
  return (
    <div className="p-2 text-info fst-italic fs-7 d-flex align-items-center gap-1">
      <span>typing</span>
      <div className="spinner-grow spinner-grow-sm" role="status"></div>
    </div>
  );
};

export default TypingIndicator;