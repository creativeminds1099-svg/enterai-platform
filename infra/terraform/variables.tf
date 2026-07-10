variable "project_id" {
  description = "GCP project ID to deploy EnterAI into."
  type        = string
}

variable "region" {
  description = "Primary region for Cloud Run services, jobs, and BigQuery dataset location."
  type        = string
  default     = "us-central1"
}

variable "bq_dataset_id" {
  description = "BigQuery dataset that holds all raw_* and enterai_* tables."
  type        = string
  default     = "enterai_registry"
}

variable "environment" {
  description = "Deployment environment label (dev | staging | production)."
  type        = string
  default     = "dev"
}

variable "collector_schedules" {
  description = "Cron schedule per collector job, staggered to avoid API quota contention."
  type        = map(string)
  default = {
    agent_registry_collector      = "5 * * * *"
    reasoning_engine_collector    = "15 * * * *"
    cloud_asset_collector         = "25 * * * *"
    iam_service_account_collector = "35 * * * *"
    runtime_log_collector         = "*/15 * * * *"
  }
}

variable "web_container_image" {
  description = "Container image for the apps/web frontend Cloud Run service."
  type        = string
}

variable "api_container_image" {
  description = "Container image for the apps/api backend Cloud Run service."
  type        = string
}

variable "collector_container_images" {
  description = "Map of collector name -> container image for its Cloud Run Job."
  type        = map(string)
  default     = {}
}
