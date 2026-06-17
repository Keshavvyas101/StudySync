import { createContext, useContext, useEffect, useState, useCallback } from "react";

const UIContext = createContext(null);

const STORAGE_KEY = "studysync-ui";
const MOBILE_BREAKPOINT = 768;

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
        focusSize: saved?.focusSize ?? "narrow",
      };
    } catch {
      return {
        focusMode: null,
        focusedTaskId: null,
        isFocusOpen: true,
        focusSize: "narrow",
      };
    }
  };

  const initial = getInitialState();

  const [focusMode, setFocusMode] = useState(initial.focusMode);
  const [focusedTaskId, setFocusedTaskId] = useState(initial.focusedTaskId);
  const [isFocusOpen, setIsFocusOpen] = useState(initial.isFocusOpen);
  const [focusSize, setFocusSize] = useState(initial.focusSize);

  // Workspace (unchanged)
  const [workspaceMode, setWorkspaceMode] = useState("tasks");

  // -----------------------------
  // 📱 MOBILE DRAWER STATE
  // null = no drawer open, "rooms" | "chat" | "focus" = which drawer is showing
  // -----------------------------
  const [mobilePanel, setMobilePanel] = useState(null);

  const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

  const openMobileRooms = useCallback(() => {
    setMobilePanel("rooms");
  }, []);

  const closeMobilePanel = useCallback(() => {
    setMobilePanel(null);
  }, []);

  // -----------------------------
  // Persist to localStorage whenever state changes
  // -----------------------------
  useEffect(() => {
    const payload = {
      focusMode,
      focusedTaskId,
      isFocusOpen,
      focusSize,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [focusMode, focusedTaskId, isFocusOpen, focusSize]);

  // -----------------------------
  // Actions
  // -----------------------------

  const openTask = (taskId) => {
    setFocusedTaskId(taskId);
    setFocusMode("task");
    setFocusSize("wide");
    setIsFocusOpen(true);
    // On mobile, open the focus drawer
    if (isMobile()) setMobilePanel("focus");
  };

  const openChat = () => {
    setFocusMode("chat");
    setFocusSize("narrow");
    setIsFocusOpen(true);
    // On mobile, open the chat/focus drawer
    if (isMobile()) setMobilePanel("chat");
  };

  const openFocusSession = (taskId = null) => {
    if (taskId) {
      setFocusedTaskId(taskId);
    }
    setFocusMode("focus");
    setFocusSize("narrow");
    setIsFocusOpen(true);
    if (isMobile()) setMobilePanel("focus");
  };

  const closeFocus = () => {
    setIsFocusOpen(false);
    if (isMobile()) setMobilePanel(null);
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
        focusSize,
        setFocusSize,

        openTask,
        openChat,
        openFocusSession,
        closeFocus,
        toggleFocus,

        workspaceMode,
        setWorkspaceMode,

        // 📱 Mobile drawer
        mobilePanel,
        setMobilePanel,
        openMobileRooms,
        closeMobilePanel,
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
