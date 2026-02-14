import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";


/**
 * @desc Get logged-in user profile
 * @route GET /api/users/me
 */
export const getMyProfile = async (req, res) => {
  res.status(200).json({
    user: req.user,
  });
};

/**
 * @desc Upload / update profile avatar
 * @route PATCH /api/users/avatar
 */
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No image file provided" });
    }

    // 🔥 Delete old avatar if exists
    if (req.user.avatar?.publicId) {
      await cloudinary.uploader.destroy(
        req.user.avatar.publicId
      );
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`,
      {
        folder: "studysync/avatars",
        public_id: `user_${req.user._id}`,
        overwrite: true,
        resource_type: "image",
      }
    );

    // ✅ Correct schema structure
    req.user.avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    await req.user.save();

    res.status(200).json({
      message: "Profile image updated",
      avatar: req.user.avatar,
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({
      message: "Failed to upload profile image",
    });
  }
};

/**
 * @desc Remove profile avatar
 * @route DELETE /api/users/avatar
 */
export const removeAvatar = async (req, res) => {
  try {
    if (req.user.avatar?.publicId) {
      await cloudinary.uploader.destroy(
        req.user.avatar.publicId
      );
    }

    req.user.avatar = {
      url: null,
      publicId: null,
    };

    await req.user.save();

    res.status(200).json({
      message: "Profile image removed",
    });
  } catch (err) {
    console.error("Avatar remove error:", err);
    res.status(500).json({
      message: "Failed to remove avatar",
    });
  }
};



