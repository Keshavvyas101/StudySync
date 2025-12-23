// src/layout/WorkspaceLayout.jsx
import Topbar from "./Topbar";
import RoomPanel from "./RoomPanel";
import FocusPanel from "./FocusPanel";
import Workspace from "../workspace/Workspace"; // IMPORTANT
import "./layout.css";

const WorkspaceLayout = () => {
  return (
    <div className="app-root">
      <Topbar />

      <div className="app-body">
        <RoomPanel />
        <Workspace />
        <FocusPanel />
      </div>
    </div>
  );
};

export default WorkspaceLayout;
