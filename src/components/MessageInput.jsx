import React, { useState } from "react";
import { FaPaperclip, FaPaperPlane, FaTimes } from "react-icons/fa";
import { uploadFileToStorage } from "../firebase/storageModel";

const MessageInput = ({ onSendMessage, onTyping, replyingTo, cancelReply }) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTextChange = (e) => {
    setText(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    setLoading(true);
    let imageUrl = "";

    if (file) {
      imageUrl = await uploadFileToStorage(file, "chat_images");
    }

    await onSendMessage({
      text,
      image: imageUrl,
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text } : null
    });

    setText("");
    setFile(null);
    setLoading(false);
    onTyping(false);
    if (cancelReply) cancelReply();
  };

  return (
    <form onSubmit={handleSend} className="bg-dark p-2 rounded border border-secondary d-flex flex-column gap-2">
      {replyingTo && (
        <div className="d-flex justify-content-between align-items-center bg-secondary p-2 rounded">
          <span className="small text-light">Replying: {replyingTo.text}</span>
          <button type="button" className="btn btn-link text-light p-0" onClick={cancelReply}>
            <FaTimes />
          </button>
        </div>
      )}
      {file && (
        <div className="d-flex align-items-center justify-content-between bg-secondary p-1 px-2 rounded">
          <small className="text-truncate text-light">{file.name}</small>
          <button type="button" className="btn btn-sm btn-danger py-0" onClick={() => setFile(null)}>
            <FaTimes />
          </button>
        </div>
      )}
      <div className="d-flex align-items-center gap-2">
        <label className="btn btn-outline-secondary border-0 text-light cursor-pointer mb-0">
          <FaPaperclip />
          <input 
            type="file" 
            accept="image/*" 
            className="d-none" 
            onChange={(e) => setFile(e.target.files[0])} 
          />
        </label>
        <input
          type="text"
          className="form-control bg-dark text-light border-0"
          placeholder="Type a message..."
          value={text}
          onChange={handleTextChange}
        />
        <button type="submit" className="btn btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center" disabled={loading}>
          <FaPaperPlane />
        </button>
      </div>
    </form>
  );
};

export default MessageInput;