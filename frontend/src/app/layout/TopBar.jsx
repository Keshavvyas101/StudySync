// src/layout/Topbar.jsx
const Topbar = () => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo">StudySync</span>
      </div>

      <div className="topbar-right">
        <button className="logout-btn">Logout</button>
      </div>
    </header>
  );
};

export default Topbar;
