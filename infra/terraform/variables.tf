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

variable "vpc_id" {
  description = "VPC ID where the RDS security group will be created"
  type        = string
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

variable "aws_account_id" {
  description = "AWS account ID, used to construct globally-unique resource names (e.g. S3 bucket suffix)."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the Application Load Balancer."
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "At least 2 public subnets required for the ALB."
  }
}

variable "app_secret_key" {
  description = "Secret key for JWT signing and session management."
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key for AI chat."
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token for fetching repo data."
  type        = string
  sensitive   = true
}

variable "github_username" {
  description = "GitHub username whose repos are displayed."
  type        = string
}

variable "resume_owner_token" {
  description = "Token that authorises resume-profile write operations."
  type        = string
  sensitive   = true
}
