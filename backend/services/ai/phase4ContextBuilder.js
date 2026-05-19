import { buildAIContext } from "./contextBuilder.js";

const compactTask = (task) => ({
  title: task.title,
  status: task.status,
  priority: task.priority,
  deadline: task.deadline,
  assignedToName: task.assignedTo?.name || null,
  subtaskCount: task.subtaskCount || 0,
  completedSubtaskCount: task.completedSubtaskCount || 0,
  tags: Array.isArray(task.tags) ? task.tags.slice(0, 5) : [],
});

const compactInsight = (insight) => ({
  type: insight.type,
  severity: insight.severity,
  title: insight.title,
  message: insight.message,
  confidence: insight.confidence,
  why: Array.isArray(insight.why) ? insight.why.slice(0, 3) : [],
});

export const buildPhase4Context = async ({
  userId,
  roomId,
  route,
  responseStyle,
  routerConfidence,
  now = new Date(),
}) => {
  const context = await buildAIContext({ userId, roomId, now });

  return {
    context,
    llmContext: {
      workspace: {
        name: context.workspace?.name,
        type: context.workspace?.type,
      },
      currentUser: {
        id: userId?.toString?.() || userId,
      },
      route,
      responseStyle,
      confidence: {
        router: routerConfidence,
        aiProfile: context.memory?.confidence || 0,
      },
      taskSummary: context.taskSummary,
      relevantTasks: {
        overdue: (context.overdueTasks || []).slice(0, 5).map(compactTask),
        today: (context.todayTasks || []).slice(0, 5).map(compactTask),
        dueSoon: (context.dueSoonTasks || []).slice(0, 5).map(compactTask),
        attention: (context.bottleneckTasks || []).slice(0, 5).map(compactTask),
      },
      aiProfileSummary: {
        bestStudyWindow: context.bestStudyWindow || null,
        avgFocusMinutes: context.avgFocusMinutes || 0,
        strengths: (context.strengths || []).slice(0, 5),
        weaknesses: (context.weaknesses || []).slice(0, 5),
        procrastinationRisk: context.procrastinationRisk || null,
        inactivityRisk: context.inactivityRisk || null,
        bestPerformanceDay: context.bestPerformanceDay || null,
      },
      recentSessionsSummary: context.sessionAnalytics,
      proactiveInsights: (context.proactiveInsights || []).slice(0, 3).map(compactInsight),
      boundaries: {
        noMutation: true,
        noRawDbDocuments: true,
        noCrossRoomData: true,
        studySyncIsSourceOfTruth: true,
      },
    },
  };
};
