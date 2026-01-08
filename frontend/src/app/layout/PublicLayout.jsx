import { Outlet, Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import Footer from "../../components/Footer";

const PublicLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <div
      className="
        min-h-screen
        flex flex-col
        bg-gradient-to-br
        from-slate-100 via-white to-slate-200
        dark:from-black dark:via-slate-900 dark:to-black
        text-slate-900 dark:text-slate-100
      "
    >
      {/* ================= HEADER ================= */}
      <header
        className="
          sticky top-0 z-50
          flex items-center justify-between
          px-6 h-16
          bg-white/80 dark:bg-slate-950/80
          backdrop-blur
          border-b border-slate-300 dark:border-slate-800
        "
      >
        {/* BRAND */}
        <Link
          to="/"
          className="text-xl font-semibold tracking-wide"
        >
          StudySync
        </Link>

        {/* ACTIONS */}
        <div className="flex items-center gap-4">
          {/* THEME TOGGLE */}
          <button
            onClick={toggleTheme}
            className="text-lg"
            title="Toggle theme"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>

          {/* LOGIN / REGISTER ONLY ON LANDING */}
          {!isAuthPage && (
            <>
              <Link
                to="/login"
                className="
                  text-sm
                  text-slate-600 dark:text-slate-300
                  hover:text-slate-900 dark:hover:text-white
                  transition
                "
              >
                Login
              </Link>

              <Link
                to="/register"
                className="
                  text-sm px-4 py-2 rounded-md
                  bg-purple-600 hover:bg-purple-700
                  text-white font-medium
                  transition
                "
              >
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ================= PAGE CONTENT ================= */}
      <main className="flex-1 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <Footer />
    </div>
  );
};

export default PublicLayout;
