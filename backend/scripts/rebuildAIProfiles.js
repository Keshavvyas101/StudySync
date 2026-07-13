import dotenv from "dotenv";
import connectDB from "../config/db.js";
import AIProfile from "../models/AIProfile.js";
import { rebuildAllAIProfiles } from "../services/ai/aiProfileService.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const deleteTestProfiles = process.argv.includes("--delete-test");

  if (deleteTestProfiles) {
    const result = await AIProfile.deleteMany({
      $or: [
        { "metadata.isTest": true },
        { "metadata.source": "test" },
      ],
    });
    // console.log(`Deleted ${result.deletedCount} test AI profiles`);
  }

  const rebuilt = await rebuildAllAIProfiles();
  console.log(`Rebuilt ${rebuilt.length} AI profiles`);

  process.exit(0);
};

run().catch((error) => {
  console.error("AI profile rebuild failed:", error);
  process.exit(1);
});
