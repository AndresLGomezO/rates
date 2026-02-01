resource "google_pubsub_topic" "topic" {
  name = var.topic_name
}

resource "google_pubsub_topic" "dlq_topic" {
  count = var.create_dlq_topic ? 1 : 0
  name  = var.dlq_topic_name != "" ? var.dlq_topic_name : "${var.topic_name}-dlq"
}

resource "google_pubsub_subscription" "subscription" {
  for_each = var.subscriptions

  name  = each.key
  topic = google_pubsub_topic.topic.name

  ack_deadline_seconds       = each.value.ack_deadline_seconds
  message_retention_duration = each.value.message_retention_duration

  retry_policy {
    minimum_backoff = each.value.minimum_backoff
    maximum_backoff = each.value.maximum_backoff
  }

  dynamic "dead_letter_policy" {
    for_each = each.value.enable_dead_lettering ? [1] : []
    content {
      dead_letter_topic     = each.value.dead_letter_topic != null ? each.value.dead_letter_topic : (var.create_dlq_topic ? google_pubsub_topic.dlq_topic[0].id : null)
      max_delivery_attempts = each.value.max_delivery_attempts
    }
  }

  dynamic "push_config" {
    for_each = each.value.push_endpoint != null ? [1] : []
    content {
      push_endpoint = each.value.push_endpoint
      oidc_token {
        service_account_email = each.value.service_account_email
      }
    }
  }
}
