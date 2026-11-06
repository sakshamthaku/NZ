import React, { useEffect, useState } from "react";
import { listenToUserChats } from "../firebase/chatModel";
import { getUserProfile } from "../firebase/userModel";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";

const ChatList = () => {
  const { currentUser } = useAuth();
  const { activeChatId, selectChat } = useChat();
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenToUserChats(currentUser.uid, async (chatList) => {
      setChats(chatList);
      const userMap = {};
      for (let chat of chatList) {
        const otherUid = chat.members.find((id) => id !== currentUser.uid);
        if (otherUid && !usersMap[otherUid]) {
          const profile = await getUserProfile(otherUid);
          userMap[otherUid] = profile;
        }
      }
      setUsersMap((prev) => ({ ...prev, ...userMap }));
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="list-group overflow-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {chats.length === 0 ? (
        <div className="text-center p-3 text-muted">No conversations yet</div>
      ) : (
        chats.map((chat) => {
          const targetUid = chat.members.find((id) => id !== currentUser.uid);
          const targetUser = usersMap[targetUid];
          const isActive = activeChatId === chat.chatId;

          return (
            <button
              key={chat.chatId}
              onClick={() => targetUser && selectChat(chat.chatId, targetUser)}
              className={`list-group-item list-group-item-action d-flex align-items-center gap-3 p-3 border-0 rounded mb-1 ${
                isActive ? "active bg-primary text-white" : "bg-dark text-light border-bottom border-secondary"
              }`}
            >
              <img
                src={targetUser?.photoURL || "https://via.placeholder.com/40"}
                alt="avatar"
                className="rounded-circle"
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
              />
              <div className="flex-grow-1 overflow-hidden">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-truncate">{targetUser?.username || "User"}</h6>
                  <small className={isActive ? "text-white-50" : "text-muted"}>
                    {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </small>
                </div>
                <small className={`d-block text-truncate ${isActive ? "text-white-50" : "text-muted"}`}>
                  {chat.lastMessage || "Started a chat"}
                </small>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

export default ChatList;