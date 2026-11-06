import React from "react";
import { useAuth } from "../hooks/useAuth";
import { FaCheck, FaCheckDouble, FaTrash, FaEdit, FaReply } from "react-icons/fa";

const MessageBubble = ({ message, onDelete, onEdit, onReply }) => {
  const { currentUser } = useAuth();
  const isOwner = message.senderId === currentUser?.uid;

  return (
    <div className={`d-flex flex-column ${isOwner ? "align-items-end" : "align-items-start"} mb-3`}>
      <div 
        className={`p-3 rounded-4 shadow-sm position-relative ${
          isOwner ? "bg-primary text-white" : "bg-secondary text-light"
        }`}
        style={{ maxWidth: "70%" }}
      >
        {message.replyTo && (
          <div className="p-2 mb-2 bg-black bg-opacity-25 rounded border-start border-3 border-info fs-7">
            <small className="fw-bold d-block">Replying to:</small>
            <small className="text-truncate d-block">{message.replyTo.text}</small>
          </div>
        )}
        
        {message.image && (
          <img src={message.image} alt="Attachment" className="img-fluid rounded mb-2" style={{ maxHeight: "250px" }} />
        )}

        {message.text && <p className="mb-1 text-break">{message.text}</p>}

        <div className="d-flex align-items-center justify-content-end gap-2 fs-8 opacity-75">
          {message.edited && <small className="fst-italic me-1">(edited)</small>}
          <small>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
          {isOwner && (
            <span>
              {message.seen ? <FaCheckDouble className="text-info" /> : <FaCheck />}
            </span>
          )}
        </div>
      </div>

      <div className="d-flex gap-2 mt-1 px-1">
        <button className="btn btn-link text-muted btn-sm p-0" onClick={() => onReply(message)} title="Reply">
          <FaReply />
        </button>
        {isOwner && (
          <>
            <button className="btn btn-link text-muted btn-sm p-0" onClick={() => onEdit(message)} title="Edit">
              <FaEdit />
            </button>
            <button className="btn btn-link text-danger btn-sm p-0" onClick={() => onDelete(message.id)} title="Delete">
              <FaTrash />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;