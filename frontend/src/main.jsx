import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import { TaskProvider } from "./context/TaskContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";

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
              <TaskProvider>
                <NotificationProvider>
                  <App/> 
                </NotificationProvider>
              </TaskProvider>
           </RoomProvider>
         </UserProvider>
       </ThemeProvider>
    </AuthProvider>
    </BrowserRouter>
  </React.StrictMode> 
);
