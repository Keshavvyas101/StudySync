import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();

  // ✅ SAFE ACCESS
  const auth = useAuth?.();
  const fetchMe = auth?.fetchMe;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await api.post("/auth/login", formData);

      if (fetchMe) {
        await fetchMe();
      }

      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div
        className="
          w-full max-w-md
          bg-white dark:bg-slate-900
          border border-slate-300 dark:border-slate-800
          rounded-2xl
          p-8
          shadow-lg
        "
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sign in to continue to StudySync
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 text-sm text-red-500 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-400">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              onChange={handleChange}
              placeholder="you@example.com"
              className="
                w-full px-3 py-2 rounded-lg
                bg-slate-100 dark:bg-slate-800
                border border-slate-300 dark:border-slate-700
                text-slate-900 dark:text-slate-100
                placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-purple-600
              "
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-400">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              onChange={handleChange}
              className="
                w-full px-3 py-2 rounded-lg
                bg-slate-100 dark:bg-slate-800
                border border-slate-300 dark:border-slate-700
                text-slate-900 dark:text-slate-100
                placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-purple-600
              "
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full mt-2 py-2.5 rounded-lg
              bg-purple-600 hover:bg-purple-700
              text-white font-medium
              transition
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
