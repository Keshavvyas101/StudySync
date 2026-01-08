import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/auth/register", formData);
      setSuccess(res.data.message || "Registration successful");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
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
            Create your account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Join StudySync and start collaborating
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {error}
          </p>
        )}

        {/* Success */}
        {success && (
          <p className="text-green-600 text-sm mb-4 text-center">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-400">
              Name
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
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

          {/* Email */}
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-400">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
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
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              minLength={6}
              required
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
