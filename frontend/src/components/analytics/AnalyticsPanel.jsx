import { useEffect, useState } from "react";
import { useRooms } from "../../context/RoomContext";
import {
  fetchRoomAnalytics,
  fetchRoomStreak,
  fetchDailyProductivity,
  fetchWeeklyConsistency,
  fetchWeeklyComparison,
  fetchLast7DaysActivity,
  fetchProductivityScore,
  fetchMyBadges,
} from "../../services/analyticsService";

import "./analytics.css";

const getScoreLabel = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Low";
};

const ranges = [
  { label: "Today", value: "1d" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All", value: "all" },
];

const AnalyticsPanel = () => {
  const { activeRoom } = useRooms();

  const [state, setState] = useState({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!activeRoom?._id) return;

    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      fetchRoomAnalytics(activeRoom._id, range),
      fetchRoomStreak(activeRoom._id),
      fetchDailyProductivity(activeRoom._id),
      fetchWeeklyConsistency(activeRoom._id),
      fetchWeeklyComparison(activeRoom._id),
      fetchLast7DaysActivity(activeRoom._id),
      fetchProductivityScore(activeRoom._id),
      fetchMyBadges(),
    ])
      .then((results) => {
        if (cancelled) return;

        const [
          data,
          streak,
          daily,
          consistency,
          comparison,
          activity7,
          productivity,
          badges,
        ] = results.map((r) => (r.status === "fulfilled" ? r.value : null));

        setState({
          data,
          streak,
          daily,
          consistency,
          comparison,
          activity7,
          productivity,
          badges,
        });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => (cancelled = true);
  }, [activeRoom, range]);

  const {
    data,
    streak,
    daily,
    consistency,
    comparison,
    activity7,
    productivity,
    badges,
  } = state;

  if (!activeRoom)
    return <div className="analytics-muted">Select a room to view analytics</div>;

  if (loading)
    return <div className="analytics-muted">Loading analytics…</div>;

  if (!data) return <div className="analytics-muted">No analytics available</div>;

  return (
    <div className="analytics space-y-10">

      {/* ===== HEADER ===== */}
      <section>
        <h2 className="analytics-title">Analytics</h2>
        <p className="analytics-muted">Track your productivity in this room</p>
      </section>

      {/* ===== OVERVIEW ===== */}
      <section>
        <h3 className="analytics-subtitle">Overview</h3>

        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-label">Current streak</div>
            <div className="analytics-value">{streak?.currentStreak ?? 0} days</div>
          </div>

          <div className="analytics-card">
            <div className="analytics-label">Productivity</div>
            <div className="analytics-value">{productivity?.score ?? 0}/100</div>
            <div className="analytics-muted text-sm">
              {getScoreLabel(productivity?.score ?? 0)}
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-label">Active days (7d)</div>
            <div className="analytics-value">
              {consistency?.activeDaysLast7 ?? 0}/7
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-label">Weekly trend</div>
            <div className="analytics-value capitalize">
              {comparison?.trend ?? "stable"}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WEEKLY ACTIVITY (REPLACES BAR GRAPH) ===== */}
      {activity7?.length > 0 && (
        <section>
          <h3 className="analytics-subtitle">Weekly activity</h3>

          <div className="analytics-week-grid">
            {activity7.map((day) => (
              <div key={day.date} className="analytics-week-day">
                <div className="analytics-week-count">{day.count}</div>
                <div className="analytics-week-label">
                  {new Date(day.date).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== ACHIEVEMENTS (SIMPLIFIED) ===== */}
      {badges && (
        <section>
          <h3 className="analytics-subtitle">Achievements</h3>

          {badges.count === 0 ? (
            <div className="analytics-muted">No achievements yet</div>
          ) : (
            <ul className="analytics-list">
              {badges.badges.map((b) => (
                <li key={b.key}>
                  <strong>{b.title}</strong> — {b.description}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ===== ADVANCED (COLLAPSIBLE) ===== */}
      <section>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="analytics-toggle"
        >
          {showAdvanced ? "Hide detailed analytics" : "View detailed analytics"}
        </button>

        {showAdvanced && (
          <div className="space-y-8 mt-6">

            {/* Room totals */}
            <div>
              <h3 className="analytics-subtitle">Room summary</h3>
              <div className="analytics-grid">
                {Object.entries(data.total).map(([key, value]) => (
                  <div key={key} className="analytics-card">
                    <div className="analytics-label">
                      {key.replaceAll("_", " ")}
                    </div>
                    <div className="analytics-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Member contributions */}
            <div>
              <h3 className="analytics-subtitle">Member contributions</h3>

              <div className="analytics-users">
                {data.users.map((u) => {
                  const total = Object.values(u.counts).reduce(
                    (a, b) => a + b,
                    0
                  );

                  return (
                    <div key={u.user._id} className="analytics-user">
                      <div className="analytics-user-header">
                        <span>{u.user.name}</span>
                        <span>{total}</span>
                      </div>

                      <div className="analytics-bar">
                        <div
                          className="analytics-bar-fill"
                          style={{
                            width: `${Math.min(total * 5, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===== RANGE FILTER ===== */}
      <div className="analytics-filters">
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`analytics-filter ${
              range === r.value ? "active" : ""
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
