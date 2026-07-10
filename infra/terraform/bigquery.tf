resource "google_bigquery_dataset" "enterai_registry" {
  dataset_id                 = var.bq_dataset_id
  project                    = var.project_id
  location                   = var.region
  friendly_name              = "EnterAI Registry"
  description                = "Raw landing tables and canonical registry tables for the EnterAI enterprise AI control plane."
  default_table_expiration_ms = null
  labels                      = local.common_labels

  depends_on = [google_project_service.required]
}

# One google_bigquery_table resource per schema file in ../bigquery/schemas.
# Table names are derived from the schema filename so this block stays in
# sync automatically as new raw_*/enterai_* schemas are added.
locals {
  schema_dir   = "${path.module}/../bigquery/schemas"
  schema_files = fileset(local.schema_dir, "*.json")
}

resource "google_bigquery_table" "registry_tables" {
  for_each = { for f in local.schema_files : trimsuffix(f, ".json") => f }

  dataset_id = google_bigquery_dataset.enterai_registry.dataset_id
  project    = var.project_id
  table_id   = each.key

  schema = file("${local.schema_dir}/${each.value}")

  labels = merge(local.common_labels, {
    table_kind = startswith(each.key, "raw_") ? "raw_landing" : "canonical"
  })

  deletion_protection = false
}
