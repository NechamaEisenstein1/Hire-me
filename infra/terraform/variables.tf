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

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16 && can(regex("^[A-Za-z0-9!@#$%^&*()_+=]*$", var.db_password))
    error_message = "DB password must be at least 16 characters and contain only alphanumeric and allowed special chars."
  }
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets required for RDS multi-AZ deployment."
  }
}

variable "environment" {
  description = "Environment stage (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
