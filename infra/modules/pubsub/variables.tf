variable "topic_name" {
  description = "Name of the Pub/Sub topic"
  type        = string
}

variable "subscriptions" {
  description = "Map of subscriptions to create. Key is subscription name, value is configuration map."
  type = map(object({
    ack_deadline_seconds       = optional(number, 600)
    message_retention_duration = optional(string, "604800s") # 7 days
    minimum_backoff            = optional(string, "10s")
    maximum_backoff            = optional(string, "600s")
    max_delivery_attempts      = optional(number, 5)
    push_endpoint              = optional(string)
    service_account_email      = optional(string)
    enable_dead_lettering      = optional(bool, true)
    dead_letter_topic          = optional(string) # Optional override, otherwise defaults to {topic_name}-dlq if enable_dead_lettering is true
  }))
  default = {}
}

variable "create_dlq_topic" {
  description = "Whether to create a default DLQ topic for this topic"
  type        = bool
  default     = false
}

variable "dlq_topic_name" {
  description = "Name of the DLQ topic (if create_dlq_topic is true)"
  type        = string
  default     = ""
}
