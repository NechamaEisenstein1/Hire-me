locals {
  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Environment = "prod"
  }
}
