import { config as loadEnv } from "dotenv";
loadEnv();

import { getContainer } from "../src/composition/container";

async function main() {
  try {
    console.log("Initializing container...");
    const c = getContainer();
    console.log("Listing bots for test user 'test-uid'...");
    const result = await c.listBots().execute("test-uid");
    console.log("Result:", result);
  } catch (err) {
    console.error("Caught error:", err);
  }
}

main();
