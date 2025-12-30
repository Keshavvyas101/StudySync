import { useState } from "react";
 import Topbar from "./TopBar";
import RoomPanel from "./RoomPanel";
import FocusPanel from "./FocusPanel";
import Workspace from "../workspace/Workspace";
import "./layout.css";

const WorkspaceLayout = () => {
  const [focusWidth, setFocusWidth] = useState(300);

  return (
    <div className="app-root">
      <Topbar />

      <div
        className="app-body"
        style={{
          gridTemplateColumns: `260px 1fr ${focusWidth}px`,
        }}
      >
        <RoomPanel />
        <Workspace />
        <FocusPanel setWidth={setFocusWidth} />
      </div>
    </div>
  );
};

export default WorkspaceLayout;
