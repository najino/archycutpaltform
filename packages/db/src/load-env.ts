import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, "../../../.env");
const localEnv = path.resolve(here, "../.env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv }); // optional package-level override
