import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { 
  listenToMessages, 
  sendMessageInChat, 
  markMessagesAsSeen, 
  setTypingState,
  deleteChatMessage,
  updateChatMessage
} from "../firebase/chatModel";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import OnlineStatus from "./OnlineStatus";
import TypingIndicator from "./TypingIndicator";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/Firebase";

const ChatWindow = () => {
  const { currentUser } = useAuth();
  const { activeChatId, activeChatUser } = useChat();
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    const unsubMessages = listenToMessages(activeChatId, setMessages);
    const unsubSeen = markMessagesAsSeen(activeChatId, currentUser.uid);

    const unsubChat = onSnapshot(doc(db, "chats", activeChatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.typing && activeChatUser) {
          setIsPeerTyping(data.typing[activeChatUser.uid] || false);
        }
      }
    });

    return () => {
      unsubMessages();
      unsubSeen();
      unsubChat();
    };
  }, [activeChatId, currentUser, activeChatUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPeerTyping]);

  const handleSend = async (payload) => {
    if (!activeChatId || !currentUser || !activeChatUser) return;
    await sendMessageInChat(activeChatId, currentUser.uid, activeChatUser.uid, payload);
  };

  const handleTyping = (isTyping) => {
    if (activeChatId && currentUser) {
      setTypingState(activeChatId, currentUser.uid, isTyping);
    }
  };

  const handleDelete = async (messageId) => {
    if (activeChatId) {
      await deleteChatMessage(activeChatId, messageId);
    }
  };

  const handleEdit = async (message) => {
    const newText = prompt("Edit message:", message.text);
    if (newText && activeChatId) {
      await updateChatMessage(activeChatId, message.id, newText);
    }
  };

  if (!activeChatUser) {
    return (
      <div className="card bg-dark text-muted border-secondary h-100 d-flex align-items-center justify-content-center p-5">
        Select or start a conversation to display messages
      </div>
    );
  }

  return (
    <div className="card bg-dark text-light border-secondary h-100 d-flex flex-column p-3">
      <div className="border-bottom border-secondary pb-2 mb-3 d-flex align-items-center gap-3">
        <img 
          src={activeChatUser.photoURL || "https://via.placeholder.com/45"} 
          alt="user" 
          className="rounded-circle"
          style={{ width: "45px", height: "45px", objectFit: "cover" }} 
        />
        <div>
          <h6 className="mb-0 text-light">{activeChatUser.username}</h6>
          <OnlineStatus isOnline={activeChatUser.online} lastSeen={activeChatUser.lastSeen} />
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto pe-2" style={{ minHeight: "300px" }}>
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            onDelete={handleDelete} 
            onm Edit={handleEdit} 
            onReply={setReplyingTo} 
          />
        ))}
        {isPeerTyping && <TypingIndicator />}
        <div ref={scrollRef} />
      </div>

      <div className="mt-2">
        <MessageInput 
          onSendMessage={handleSend} 
          onTyping={handleTyping} 
          replyingTo={replyingTo}
          cancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
};

export default ChatWindow;