import { useState } from "react";
import Topbar from "./TopBar";
import RoomPanel from "./RoomPanel";
import FocusPanel from "./FocusPanel";
import Workspace from "../workspace/Workspace";
import "./layout.css";

const MIN_FOCUS_WIDTH = 240;
const MAX_FOCUS_WIDTH = 420;

const WorkspaceLayout = () => {
  const [focusWidth, setFocusWidth] = useState(300);

  const clampedFocusWidth = Math.min(
    MAX_FOCUS_WIDTH,
    Math.max(MIN_FOCUS_WIDTH, focusWidth)
  );

  return (
    <div className="app-root h-screen overflow-hidden flex flex-col">
      {/* TOPBAR */}
      <Topbar />

      {/* MAIN BODY */}
      <div
        className="app-body flex-1 grid overflow-hidden"
        style={{
          gridTemplateColumns: `260px minmax(0, 1fr) ${clampedFocusWidth}px`,
        }}
      >
        {/* LEFT: ROOMS */}
        <div className="overflow-hidden border-r border-slate-200 dark:border-slate-800">
          <RoomPanel />
        </div>

        {/* CENTER: WORKSPACE */}
        <div className="overflow-hidden">
          <Workspace />
        </div>

        {/* RIGHT: FOCUS / CHAT */}
        <div className="overflow-hidden border-l border-slate-200 dark:border-slate-800">
          <FocusPanel setWidth={setFocusWidth} />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
