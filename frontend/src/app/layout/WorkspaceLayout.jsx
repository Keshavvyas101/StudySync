import Topbar from "./TopBar";
import RoomPanel from "./RoomPanel";
import FocusPanel from "./FocusPanel";
import Workspace from "../workspace/Workspace";
import "./layout.css";



const WorkspaceLayout = () => {
  return (
    <div className="app-root">
      <Topbar />
      {/* <h1>hari hari</h1> */}

      <div className="app-body">
        <RoomPanel />
        <Workspace />
        <FocusPanel />
      </div>
    </div>
  );
};

export default WorkspaceLayout;
