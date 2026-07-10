terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  common_labels = {
    app         = "enterai"
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "bigquery.googleapis.com",
    "run.googleapis.com",
    "cloudscheduler.googleapis.com",
    "aiplatform.googleapis.com",
    "cloudasset.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
