const isEnabled = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return value.toString().trim().toLowerCase() === "true";
};

export const aiFeatureFlags = {
  aiEnabled: isEnabled(process.env.AI_ENABLED, true),
  jarvisProactive: isEnabled(process.env.JARVIS_PROACTIVE, false),
  jarvisActions: isEnabled(process.env.JARVIS_ACTIONS, false),
};

export const requireAIEnabled = (req, res, next) => {
  if (!aiFeatureFlags.aiEnabled) {
    return res.status(503).json({
      success: false,
      message: "AI features are disabled",
    });
  }

  next();
};
