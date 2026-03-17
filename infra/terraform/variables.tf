variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "hire-me"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "frontend_domain" {
  description = "Domain for CloudFront distribution"
  type        = string
  default     = ""
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS"
  type        = list(string)
}
