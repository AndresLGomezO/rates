# Pub/Sub Module

This module creates a Pub/Sub topic and optionally a Dead Letter Queue (DLQ) topic and subscriptions.

## Inputs

| Name             | Description                           | Type          | Default | Required |
| ---------------- | ------------------------------------- | ------------- | ------- | :------: |
| topic_name       | Name of the Pub/Sub topic             | `string`      | n/a     |   yes    |
| subscriptions    | Map of subscriptions to create        | `map(object)` | `{}`    |    no    |
| create_dlq_topic | Whether to create a default DLQ topic | `bool`        | `false` |    no    |
| dlq_topic_name   | Name of the DLQ topic                 | `string`      | `""`    |    no    |

## Outputs

| Name             | Description                   |
| ---------------- | ----------------------------- |
| topic_id         | The ID of the Pub/Sub topic   |
| topic_name       | The name of the Pub/Sub topic |
| dlq_topic_id     | The ID of the DLQ topic       |
| subscription_ids | The IDs of the subscriptions  |
