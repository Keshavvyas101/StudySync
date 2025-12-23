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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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

      // backend response message
      setSuccess(res.data.message || "Registration successful");

      // optional delay so user sees message
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
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#15151c] p-6 rounded-lg border border-white/10"
      >
        <h2 className="text-xl font-semibold mb-6 text-center">
          Register
        </h2>

        {/* ERROR MESSAGE */}
        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">
            {error}
          </p>
        )}

        {/* SUCCESS MESSAGE */}
        {success && (
          <p className="text-green-400 text-sm mb-4 text-center">
            {success}
          </p>
        )}

        <input
          name="name"
          placeholder="Name"
          required
          onChange={handleChange}
          className="w-full mb-4 px-3 py-2 rounded bg-[#0f0f14] border border-white/10"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          onChange={handleChange}
          className="w-full mb-4 px-3 py-2 rounded bg-[#0f0f14] border border-white/10"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          onChange={handleChange}
          className="w-full mb-6 px-3 py-2 rounded bg-[#0f0f14] border border-white/10"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-400">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
