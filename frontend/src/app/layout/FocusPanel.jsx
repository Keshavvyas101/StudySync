// src/layout/FocusPanel.jsx
const FocusPanel = () => {
  return (
    <aside className="focus-panel">
      <h3 className="panel-title">Focus Mode</h3>

      <div className="focus-timer">25:00</div>

      <button className="primary-btn">Start Focus</button>

      <p className="focus-quote">
        “The only way to do great work is to love what you do.”
      </p>
    </aside>
  );
};

export default FocusPanel;
