resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  description = "Security group for RDS PostgreSQL access"
  vpc_id      = var.vpc_id

  lifecycle {
    precondition {
      condition     = length(var.rds_allowed_cidr_blocks) > 0 || length(var.rds_allowed_source_security_group_ids) > 0
      error_message = "Configure at least one RDS ingress source via rds_allowed_cidr_blocks or rds_allowed_source_security_group_ids."
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_security_group_rule" "rds_ingress_cidr" {
  for_each          = toset(var.rds_allowed_cidr_blocks)
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.rds.id
  description       = "PostgreSQL from approved CIDR ${each.value}"
}

resource "aws_security_group_rule" "rds_ingress_sg" {
  for_each                 = toset(var.rds_allowed_source_security_group_ids)
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = each.value
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL from approved source security group ${each.value}"
}

resource "random_id" "rds_final_snapshot_suffix" {
  byte_length = 2

  keepers = {
    db_identifier = "${var.project_name}-postgres-${var.environment}"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = local.tags
}

resource "aws_db_instance" "postgres" {
  identifier            = "${var.project_name}-postgres-${var.environment}"
  engine                = "postgres"
  engine_version        = "16"
  instance_class        = var.environment == "prod" ? "db.t4g.small" : "db.t4g.micro"
  allocated_storage     = var.environment == "prod" ? 100 : 50
  max_allocated_storage = var.environment == "prod" ? 500 : 100

  db_name  = "hireme"
  username = "hiremeadmin"
  password = var.db_password

  db_subnet_group_name                = aws_db_subnet_group.main.name
  vpc_security_group_ids              = [aws_security_group.rds.id]
  publicly_accessible                 = false
  storage_encrypted                   = true
  storage_type                        = "gp3"
  backup_retention_period             = var.environment == "prod" ? 30 : 7
  skip_final_snapshot                 = var.environment == "prod" ? false : true
  final_snapshot_identifier           = var.environment == "prod" ? "${var.project_name}-postgres-${var.environment}-final-${random_id.rds_final_snapshot_suffix.hex}" : null
  deletion_protection                 = var.environment == "prod" ? true : false
  enabled_cloudwatch_logs_exports     = ["postgresql"]
  iam_database_authentication_enabled = true
  multi_az                            = var.environment == "prod" ? true : false
  copy_tags_to_snapshot               = true

  tags = local.tags
}
