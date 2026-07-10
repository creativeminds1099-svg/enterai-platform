resource "google_cloud_run_v2_service" "api" {
  name     = "enterai-api"
  project  = var.project_id
  location = var.region
  labels   = local.common_labels

  template {
    service_account = google_service_account.api_runtime.email
    containers {
      image = var.api_container_image
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "BQ_DATASET_ID"
        value = var.bq_dataset_id
      }
      ports {
        container_port = 8080
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service" "web" {
  name     = "enterai-web"
  project  = var.project_id
  location = var.region
  labels   = local.common_labels

  template {
    containers {
      image = var.web_container_image
      env {
        name  = "VITE_API_BASE_URL"
        value = google_cloud_run_v2_service.api.uri
      }
      ports {
        container_port = 8080
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.api]
}

resource "google_cloud_run_v2_job" "collectors" {
  for_each = var.collector_container_images

  name     = "enterai-${replace(each.key, "_", "-")}"
  project  = var.project_id
  location = var.region
  labels   = local.common_labels

  template {
    template {
      service_account = google_service_account.collector_runtime.email
      containers {
        image = each.value
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.bq_dataset_id
        }
      }
      max_retries = 2
      timeout     = "900s"
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_job" "reconciler" {
  name     = "enterai-reconciler"
  project  = var.project_id
  location = var.region
  labels   = local.common_labels

  template {
    template {
      service_account = google_service_account.reconciler_runtime.email
      containers {
        image = coalesce(lookup(var.collector_container_images, "reconciler", null), var.api_container_image)
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.bq_dataset_id
        }
      }
      max_retries = 1
      timeout     = "1800s"
    }
  }

  depends_on = [google_project_service.required]
}
