import AIProfile from "../../models/AIProfile.js";
import Room from "../../models/Room.js";
import StudySession from "../../models/StudySession.js";
import Task from "../../models/Task.js";
import { generateBehaviorInsights } from "./insightEngine.js";
import { normalizeTopicList } from "./subjectNormalizer.js";

export const updateAIProfileFromInsights = async ({
  userId,
  workspaceId,
  insights,
}) => {
  if (!userId || !workspaceId || !insights) return null;

  const profile =
    (await AIProfile.findOne({ user: userId, workspace: workspaceId })) ||
    new AIProfile({ user: userId, workspace: workspaceId });

  profile.preferences.bestStudyWindow = insights.bestStudyWindow || null;
  profile.preferences.avgFocusSeconds = Number(insights.avgFocusSeconds) || 0;

  profile.strengths = normalizeTopicList(insights.strongestSubjects);
  profile.weaknesses = normalizeTopicList(insights.weakestSubjects);

  profile.patterns.procrastinationRisk = insights.procrastinationRisk || "low";
  profile.patterns.inactivityRisk = insights.inactivityRisk || "high";
  profile.patterns.bestPerformanceDay = insights.bestPerformanceDay || null;
  profile.patterns.preferredStudyHours = insights.preferredStudyHours || [];

  profile.confidence = insights.confidence || 0;
  profile.metadata.profileVersion = 2;
  profile.metadata.lastUpdatedAt = new Date();
  profile.metadata.sessionCount = insights.sessionCount || 0;
  profile.metadata.validSessionCount = insights.validSessionCount || 0;

  await profile.save();

  await AIProfile.updateOne(
    { _id: profile._id },
    { $unset: { "preferences.avgFocusMinutes": "" } }
  );

  return AIProfile.findById(profile._id);
};

export const rebuildAIProfileForWorkspace = async ({ userId, workspaceId }) => {
  const [room, sessions, tasks] = await Promise.all([
    Room.findById(workspaceId),
    StudySession.find({
      user: userId,
      room: workspaceId,
      status: "completed",
    })
      .populate("task", "title tags status deadline priority")
      .sort({ startedAt: -1 })
      .limit(500),
    Task.find({ room: workspaceId }).sort({ createdAt: -1 }).limit(500),
  ]);

  if (!room) return null;

  const insights = generateBehaviorInsights({ sessions, tasks, room });
  return updateAIProfileFromInsights({
    userId,
    workspaceId,
    insights,
  });
};

export const rebuildExistingAIProfile = async (profileId) => {
  const profile = await AIProfile.findById(profileId);
  if (!profile) return null;

  return rebuildAIProfileForWorkspace({
    userId: profile.user,
    workspaceId: profile.workspace,
  });
};

export const rebuildAllAIProfiles = async () => {
  const profiles = await AIProfile.find({}, "user workspace");
  const rebuilt = [];

  for (const profile of profiles) {
    const updated = await rebuildAIProfileForWorkspace({
      userId: profile.user,
      workspaceId: profile.workspace,
    });
    if (updated) rebuilt.push(updated);
  }

  return rebuilt;
};

export const updateAIProfileForSession = async (session) => {
  if (!session?.user || !session?.room) return null;

  return rebuildAIProfileForWorkspace({
    userId: session.user,
    workspaceId: session.room,
  });
};
