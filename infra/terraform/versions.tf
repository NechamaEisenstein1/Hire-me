terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.90"
    }
  }

  backend "s3" {
    bucket         = "hire-me-terraform-state-295552411541"
    key            = "hire-me/dev/terraform.tfstate"
    region         = "eu-north-1"
    encrypt      = true
    use_lockfile = true
  }
}
