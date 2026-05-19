import { registerUser, loginUser } from "../services/authService.js";
import generateToken from "../utils/generateToken.js";
import { checkDueSoonTasksForUser } from "../services/dueSoonService.js";
import { ensurePersonalWorkspaceForUser } from "../services/personalWorkspaceService.js";
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
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
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
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
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

  res.status(500).json({
    message: error.message,
  });
}
};

/**
 * @desc Logout user
 * @route POST /api/auth/logout
 */
export const logout = async (req, res) => {
  res.cookie("token", "", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  expires: new Date(0),
});

  res.status(200).json({ message: "Logged out successfully" });
};
