output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}
