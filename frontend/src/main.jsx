import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ChatProvider } from "./context/ChatContext";

import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import { TaskProvider } from "./context/TaskContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";
import { UIProvider } from "./context/UIContext";
import { StudySessionProvider } from "./context/StudySessionContext";




import { NotificationProvider } from "./context/NotificationContext";

// Apply theme before first paint
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
         <UserProvider>
           <RoomProvider>
  <ChatProvider>
    <TaskProvider>
      <StudySessionProvider>
        <NotificationProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </NotificationProvider>
      </StudySessionProvider>
    </TaskProvider>
  </ChatProvider>
</RoomProvider>
         </UserProvider>
       </ThemeProvider>
    </AuthProvider>
    </BrowserRouter>
  </React.StrictMode> 
);
