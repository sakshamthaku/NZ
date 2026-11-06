import React, { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatUser, setActiveChatUser] = useState(null);

  const selectChat = (chatId, targetUser) => {
    setActiveChatId(chatId);
    setActiveChatUser(targetUser);
  };

  return (
    <ChatContext.Provider value={{ activeChatId, activeChatUser, selectChat }}>
      {children}
    </ChatContext.Provider>
  );
};