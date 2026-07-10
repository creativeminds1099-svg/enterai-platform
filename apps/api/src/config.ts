export const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  datasetId: process.env.BQ_DATASET_ID ?? "enterai_registry",
  port: Number(process.env.PORT ?? 8080),
  useFixtures: (process.env.ENTERAI_USE_FIXTURES ?? "true").toLowerCase() === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
