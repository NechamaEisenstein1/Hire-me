# ─── ECR Repository ───────────────────────────────────────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = var.environment != "prod"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

# ─── CloudWatch Log Group ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-backend-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = local.tags
}

# ─── IAM – Task Execution Role ────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_ssm_read" {
  name = "ssm-secrets-read"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter", "ssm:GetParameters"]
      Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/${var.environment}/*"
    }]
  })
}

# ─── SSM Parameters (secrets) ─────────────────────────────────────────────────

resource "aws_ssm_parameter" "app_secret_key" {
  name  = "/${var.project_name}/${var.environment}/app_secret_key"
  type  = "SecureString"
  value = var.app_secret_key

  tags = local.tags
}

resource "aws_ssm_parameter" "gemini_api_key" {
  name  = "/${var.project_name}/${var.environment}/gemini_api_key"
  type  = "SecureString"
  value = var.gemini_api_key

  tags = local.tags
}

resource "aws_ssm_parameter" "github_token" {
  name  = "/${var.project_name}/${var.environment}/github_token"
  type  = "SecureString"
  value = var.github_token

  tags = local.tags
}

resource "aws_ssm_parameter" "resume_owner_token" {
  name  = "/${var.project_name}/${var.environment}/resume_owner_token"
  type  = "SecureString"
  value = var.resume_owner_token

  tags = local.tags
}

# ─── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  description = "Allow HTTP inbound to ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_security_group" "ecs_backend" {
  name_prefix = "${var.project_name}-ecs-backend-"
  description = "Allow traffic from ALB to backend containers"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

# Allow ECS backend to reach RDS
resource "aws_security_group_rule" "rds_from_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.ecs_backend.id
  description              = "PostgreSQL access from ECS backend"
}

# ─── Application Load Balancer ────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  tags = local.tags
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-backend-${var.environment}"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = local.tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ─── ECS Task Definition ──────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "APP_ENV", value = var.environment },
      { name = "DATABASE_URL", value = "postgresql+asyncpg://hiremeadmin:${var.db_password}@${aws_db_instance.postgres.address}:5432/hireme" },
      { name = "CORS_ORIGINS", value = "https://${aws_cloudfront_distribution.frontend.domain_name}" },
      { name = "GITHUB_USERNAME", value = var.github_username },
    ]

    secrets = [
      { name = "APP_SECRET_KEY", valueFrom = aws_ssm_parameter.app_secret_key.arn },
      { name = "GEMINI_API_KEY", valueFrom = aws_ssm_parameter.gemini_api_key.arn },
      { name = "GITHUB_TOKEN", valueFrom = aws_ssm_parameter.github_token.arn },
      { name = "RESUME_OWNER_TOKEN", valueFrom = aws_ssm_parameter.resume_owner_token.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = local.tags
}

# ─── ECS Service ──────────────────────────────────────────────────────────────

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  # Allow external image updates (deploy workflow) without triggering tf drift
  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = local.tags
}
