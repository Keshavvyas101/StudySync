import { useEffect, useState } from "react";
import Topbar from "./TopBar";
import RoomPanel from "./RoomPanel";
import FocusPanel from "./FocusPanel";
import Workspace from "../workspace/Workspace";
import MobileNav from "./MobileNav";
import { useUI } from "../../context/UIContext";

import "./layout.css";

const MIN_FOCUS_WIDTH = 280;
const MAX_FOCUS_WIDTH = 3000;

// Semantic defaults (product decisions)
const NARROW_WIDTH = 340; // chat
const WIDE_WIDTH = 620;   // task details

const WorkspaceLayout = () => {
  const { isFocusOpen, focusSize, mobilePanel, closeMobilePanel } = useUI();

  const [focusWidth, setFocusWidth] = useState(NARROW_WIDTH);

  // When focusSize changes (chat <-> task), auto-adjust width
  useEffect(() => {
    if (!isFocusOpen) return;

    if (focusSize === "wide") {
      setFocusWidth(WIDE_WIDTH);
    } else {
      setFocusWidth(NARROW_WIDTH);
    }
  }, [focusSize, isFocusOpen]);

  const clampedFocusWidth = Math.min(
    MAX_FOCUS_WIDTH,
    Math.max(MIN_FOCUS_WIDTH, focusWidth)
  );

  // Which mobile drawers are active
  const isRoomDrawerOpen = mobilePanel === "rooms";
  const isFocusDrawerOpen = mobilePanel === "chat" || mobilePanel === "focus";

  return (
    <div className="app-root h-screen overflow-hidden flex flex-col">
      {/* TOPBAR */}
      <Topbar />

      {/* MAIN BODY */}
      <div
        className="app-body flex-1 grid overflow-hidden"
        style={{
          gridTemplateColumns: `260px minmax(0, 1fr) ${
            isFocusOpen ? clampedFocusWidth : 0
          }px`,
          transition: "grid-template-columns 200ms ease",
        }}
      >
        {/* LEFT: ROOMS — hidden on mobile via CSS, shown as drawer */}
        <div className="app-col-left overflow-hidden border-r border-slate-200 dark:border-slate-800">
          <RoomPanel />
        </div>

        {/* CENTER: WORKSPACE */}
        <div className="overflow-hidden">
          <Workspace />
        </div>

        {/* RIGHT: FOCUS / CHAT — hidden on mobile via CSS, shown as drawer */}
        <div className="app-col-right overflow-hidden border-l border-slate-200 dark:border-slate-800">
          <FocusPanel setWidth={setFocusWidth} />
        </div>
      </div>

      {/* ============================
         📱 MOBILE DRAWERS (only visible ≤768px via CSS)
      =============================== */}

      {/* Room drawer overlay */}
      {isRoomDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={closeMobilePanel}>
          <div
            className="mobile-drawer mobile-drawer-left"
            onClick={(e) => e.stopPropagation()}
          >
            <RoomPanel />
          </div>
        </div>
      )}

      {/* Focus/Chat drawer overlay */}
      {isFocusDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={closeMobilePanel}>
          <div
            className="mobile-drawer mobile-drawer-right"
            onClick={(e) => e.stopPropagation()}
          >
            <FocusPanel setWidth={() => {}} />
          </div>
        </div>
      )}

      {/* 📱 BOTTOM NAV (only visible ≤768px via CSS) */}
      <MobileNav />
    </div>
  );
};

export default WorkspaceLayout;
