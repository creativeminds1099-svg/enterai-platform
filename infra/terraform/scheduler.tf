resource "google_cloud_scheduler_job" "collector_schedule" {
  for_each = var.collector_schedules

  name      = "enterai-${replace(each.key, "_", "-")}-schedule"
  project   = var.project_id
  region    = var.region
  schedule  = each.value
  time_zone = "Etc/UTC"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/enterai-${replace(each.key, "_", "-")}:run"

    oauth_token {
      service_account_email = google_service_account.scheduler_invoker.email
    }
  }

  depends_on = [google_cloud_run_v2_job.collectors]
}

resource "google_service_account" "scheduler_invoker" {
  project      = var.project_id
  account_id   = "enterai-scheduler-invoker"
  display_name = "EnterAI Cloud Scheduler invoker"
}

resource "google_project_iam_member" "scheduler_invoker_run" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.scheduler_invoker.email}"
}
