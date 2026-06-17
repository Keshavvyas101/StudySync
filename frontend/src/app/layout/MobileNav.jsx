import { useUI } from "../../context/UIContext";

const RoomsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const TasksIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M6.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v10.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 17.25V6.75A2.25 2.25 0 016.75 4.5z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

const FocusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MobileNav = () => {
  const {
    mobilePanel,
    setMobilePanel,
    closeMobilePanel,
    setFocusMode,
    setIsFocusOpen,
    setFocusSize,
  } = useUI();

  const tabs = [
    { id: "rooms", label: "Rooms", icon: <RoomsIcon /> },
    { id: null, label: "Tasks", icon: <TasksIcon /> },
    { id: "chat", label: "Chat", icon: <ChatIcon /> },
    { id: "focus", label: "Focus", icon: <FocusIcon /> },
  ];

  const handleTab = (tabId) => {
    if (tabId === null) {
      // Tasks = close any drawer, show workspace
      closeMobilePanel();
      return;
    }

    if (mobilePanel === tabId) {
      // Toggle off if tapping active tab
      closeMobilePanel();
      return;
    }

    // Open the corresponding drawer
    setMobilePanel(tabId);

    // Also set focus mode context for chat/focus tabs
    if (tabId === "chat") {
      setFocusMode("chat");
      setFocusSize("narrow");
      setIsFocusOpen(true);
    } else if (tabId === "focus") {
      setFocusMode("focus");
      setFocusSize("narrow");
      setIsFocusOpen(true);
    }
  };

  return (
    <nav className="mobile-nav">
      {tabs.map((tab) => {
        const isActive = mobilePanel === tab.id;
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => handleTab(tab.id)}
            className={`mobile-nav-tab ${isActive ? "mobile-nav-tab-active" : ""}`}
          >
            {tab.icon}
            <span className="mobile-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileNav;
