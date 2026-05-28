import { createContext, useContext, useEffect, useState } from "react";

const UIContext = createContext(null);

const STORAGE_KEY = "studysync-ui";

export const UIProvider = ({ children }) => {
  // -----------------------------
  // Load initial state from localStorage
  // -----------------------------
  const getInitialState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        focusMode: saved?.focusMode ?? null,
        focusedTaskId: saved?.focusedTaskId ?? null,
        isFocusOpen: saved?.isFocusOpen ?? true,
        focusSize: saved?.focusSize ?? "narrow", // 👈 NEW
      };
    } catch {
      return {
        focusMode: null,
        focusedTaskId: null,
        isFocusOpen: true,
        focusSize: "narrow", // 👈 NEW
      };
    }
  };

  const initial = getInitialState();

  const [focusMode, setFocusMode] = useState(initial.focusMode);
  const [focusedTaskId, setFocusedTaskId] = useState(initial.focusedTaskId);
  const [isFocusOpen, setIsFocusOpen] = useState(initial.isFocusOpen);
  const [focusSize, setFocusSize] = useState(initial.focusSize); // 👈 NEW

  // Workspace (unchanged)
  const [workspaceMode, setWorkspaceMode] = useState("tasks");

  // -----------------------------
  // Persist to localStorage whenever state changes
  // -----------------------------
  useEffect(() => {
    const payload = {
      focusMode,
      focusedTaskId,
      isFocusOpen,
      focusSize, // 👈 persist
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [focusMode, focusedTaskId, isFocusOpen, focusSize]);

  // -----------------------------
  // Actions
  // -----------------------------

  const openTask = (taskId) => {
    setFocusedTaskId(taskId);
    setFocusMode("task");
    setFocusSize("wide");     // 👈 KEY DECISION
    setIsFocusOpen(true);
  };

  const openChat = () => {
    setFocusMode("chat");
    setFocusSize("narrow");   // 👈 KEY DECISION
    setIsFocusOpen(true);
  };

  const openFocusSession = (taskId = null) => {
    if (taskId) {
      setFocusedTaskId(taskId);
    }
    setFocusMode("focus");
    setFocusSize("narrow");
    setIsFocusOpen(true);
  };

  const closeFocus = () => {
    setIsFocusOpen(false);
  };

  const toggleFocus = () => {
    setIsFocusOpen((v) => !v);
  };

  return (
    <UIContext.Provider
      value={{
        focusMode,
        setFocusMode,
        focusedTaskId,
        isFocusOpen,
        focusSize,       // 👈 exposed
        setFocusSize,    // 👈 exposed

        openTask,
        openChat,
        openFocusSession,
        closeFocus,
        toggleFocus,

        workspaceMode,
        setWorkspaceMode,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
};
