output "topic_id" {
  description = "The ID of the Pub/Sub topic"
  value       = google_pubsub_topic.topic.id
}

output "topic_name" {
  description = "The name of the Pub/Sub topic"
  value       = google_pubsub_topic.topic.name
}

output "dlq_topic_id" {
  description = "The ID of the DLQ topic (if created)"
  value       = var.create_dlq_topic ? google_pubsub_topic.dlq_topic[0].id : null
}

output "subscription_ids" {
  description = "The IDs of the subscriptions"
  value       = { for k, v in google_pubsub_subscription.subscription : k => v.id }
}
