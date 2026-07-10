output "api_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "Base URL of the deployed apps/api Cloud Run service."
}

output "web_url" {
  value       = google_cloud_run_v2_service.web.uri
  description = "Base URL of the deployed apps/web Cloud Run service."
}

output "bq_dataset_id" {
  value       = google_bigquery_dataset.enterai_registry.dataset_id
  description = "BigQuery dataset holding all raw_* and enterai_* tables."
}
