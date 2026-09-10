// Batch evaluator entrypoint: npm run evaluate -- --input <cases.json> --output <kits.json>
//
// Runs the EXACT same generation pipeline used by the web app
// (services/evaluation/pipeline.ts) against a list of cases, continuing
// after any individual case failure (see services/evaluation/batchEvaluate.ts),
// and writes output matching the assessment's Appendix B shape. Requires
// only LLM_API_KEY - no MongoDB connection is needed to run it.

// Default to "evaluation" retrieval mode (allows localhost/private targets
// for local fixture company sites) unless the caller explicitly overrides
// RETRIEVAL_ENV. Must happen before any module reads env.ts.
process.env.RETRIEVAL_ENV = process.env.RETRIEVAL_ENV || "evaluation";

import { readFile, writeFile } from "node:fs/promises";
import { runGenerationPipeline } from "../services/evaluation/pipeline.js";
import { evaluateCases, buildOutputDocument } from "../services/evaluation/batchEvaluate.js";
import { logger } from "../config/logger.js";

interface CliArgs {
  input: string;
  output: string;
}

function parseArgs(argv: string[]): CliArgs {
  let input: string | undefined;
  let output: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") input = argv[++i];
    else if (argv[i] === "--output") output = argv[++i];
  }
  if (!input || !output) {
    throw new Error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
  }
  return { input, output };
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  logger.info(`Reading cases from ${input}`);
  const raw = JSON.parse(await readFile(input, "utf-8"));
  if (!Array.isArray(raw)) {
    throw new Error("Input file must contain a JSON array of cases");
  }

  const results = await evaluateCases(raw, runGenerationPipeline, {
    onLog: (message) => logger.info(message),
  });

  const outputDoc = buildOutputDocument(results);
  await writeFile(output, JSON.stringify(outputDoc, null, 2), "utf-8");
  logger.info(`Wrote ${results.length} result(s) to ${output}`);

  const failedCount = results.filter((r) => r.status === "failed").length;
  if (failedCount > 0) {
    logger.warn(`${failedCount}/${results.length} case(s) failed - see error details in output file`);
  }
}

main().catch((err) => {
  logger.error("Evaluator crashed", err);
  process.exitCode = 1;
});
