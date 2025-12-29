import { useEffect, useRef } from "react";
import { ChatProvider } from "../../context/ChatContext";
import ChatPanel from "../chat/ChatPanel";

const MIN_WIDTH = 220;
const MAX_WIDTH = 520;

const FocusPanel = ({ setWidth }) => {
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setWidth]);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  return (
    <div className="focus-panel">
      {/* LEFT EDGE RESIZE HANDLE */}
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
      />

      <ChatProvider>
        <ChatPanel />
      </ChatProvider>
    </div>
  );
};

export default FocusPanel;
