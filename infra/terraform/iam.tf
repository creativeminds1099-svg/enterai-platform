# Service account used by every collector Cloud Run Job. Scoped to
# read-only discovery permissions plus write access limited to the raw
# landing tables (never canonical tables — those are only written by the
# reconciler, per agents/harness/approval_gate.py).
resource "google_service_account" "collector_runtime" {
  project      = var.project_id
  account_id   = "enterai-collector-runtime"
  display_name = "EnterAI collector runtime"
  description  = "Runs services/collectors/* Cloud Run Jobs. Read-only on discovery APIs, write-only on raw_* tables."
}

resource "google_service_account" "reconciler_runtime" {
  project      = var.project_id
  account_id   = "enterai-reconciler-runtime"
  display_name = "EnterAI reconciler runtime"
  description  = "Runs services/reconciler. Reads raw_* tables, writes enterai_* canonical tables via the approval gate."
}

resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = "enterai-api-runtime"
  display_name = "EnterAI API runtime"
  description  = "Runs apps/api. Read-only on enterai_* canonical tables."
}

locals {
  collector_discovery_roles = [
    "roles/agentregistry.viewer",
    "roles/aiplatform.viewer",
    "roles/cloudasset.viewer",
    "roles/iam.securityReviewer",
    "roles/logging.viewer",
  ]
}

resource "google_project_iam_member" "collector_discovery" {
  for_each = toset(local.collector_discovery_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.collector_runtime.email}"
}

resource "google_project_iam_member" "collector_bq_write" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.collector_runtime.email}"
}

resource "google_project_iam_member" "reconciler_bq_write" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.reconciler_runtime.email}"
}

resource "google_project_iam_member" "api_bq_read" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "api_bq_jobuser" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}
