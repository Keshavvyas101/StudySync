import { registerUser, loginUser } from "../services/authService.js";
import generateToken from "../utils/generateToken.js";
import { checkDueSoonTasksForUser } from "../services/dueSoonService.js";
import { ensurePersonalWorkspaceForUser } from "../services/personalWorkspaceService.js";

const getAuthCookieOptions = (req) => {
  const isSecureRequest =
    req.secure || req.headers["x-forwarded-proto"] === "https";
  const useCrossSiteCookie =
    process.env.NODE_ENV === "production" || isSecureRequest;

  return {
    httpOnly: true,
    secure: useCrossSiteCookie,
    sameSite: useCrossSiteCookie ? "none" : "lax",
  };
};

/**
 * @desc Register new user
 * @route POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const lowerEmail = email.toLowerCase();

    const user = await registerUser({
      name,
      email: lowerEmail,
      password,
    });

    const token = generateToken(user._id);
    await ensurePersonalWorkspaceForUser(user._id);

    res.cookie("token", token, {
      ...getAuthCookieOptions(req),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

/**
 * @desc Login user
 * @route POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      
      return res
        .status(400)
        .json({ message: "Email and password required" });
    }

    const user = await loginUser({ email, password });

    const token = generateToken(user._id);
    await ensurePersonalWorkspaceForUser(user._id);

    res.cookie("token", token, {
      ...getAuthCookieOptions(req),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });


    
    checkDueSoonTasksForUser(user._id).catch(console.error);
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
  console.error("LOGIN FAILED:", error);

  res.status(error.statusCode || 400).json({
    message: error.message || "Login failed",
  });
}
};

/**
 * @desc Logout user
 * @route POST /api/auth/logout
 */
export const logout = async (req, res) => {
  res.cookie("token", "", {
    ...getAuthCookieOptions(req),
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged out successfully" });
};
