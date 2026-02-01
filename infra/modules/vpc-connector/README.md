# VPC Connector Module

This module creates a Serverless VPC Access connector to allow Cloud Run to access resources in a VPC.

## Inputs

| Name           | Description                                   | Type     | Default    | Required |
| -------------- | --------------------------------------------- | -------- | ---------- | :------: |
| connector_name | Name of the VPC connector                     | `string` | n/a        |   yes    |
| region         | Region for the VPC connector                  | `string` | n/a        |   yes    |
| network        | Name of the VPC network                       | `string` | n/a        |   yes    |
| ip_cidr_range  | IP CIDR range for the connector (must be /28) | `string` | n/a        |   yes    |
| min_instances  | Minimum number of instances                   | `number` | `2`        |    no    |
| max_instances  | Maximum number of instances                   | `number` | `3`        |    no    |
| machine_type   | Machine type for the connector instances      | `string` | `e2-micro` |    no    |

## Outputs

| Name           | Description                   |
| -------------- | ----------------------------- |
| connector_id   | The ID of the VPC connector   |
| connector_name | The name of the VPC connector |
