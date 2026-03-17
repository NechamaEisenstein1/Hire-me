output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
