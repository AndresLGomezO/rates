# VPC Module

This module creates a VPC network and a subnetwork with Private Google Access enabled.

## Inputs

| Name                         | Description                                | Type     | Default | Required |
| ---------------------------- | ------------------------------------------ | -------- | ------- | :------: |
| network_name                 | Name of the VPC network                    | `string` | n/a     |   yes    |
| subnet_name                  | Name of the subnet                         | `string` | n/a     |   yes    |
| subnet_cidr                  | CIDR range for the subnet                  | `string` | n/a     |   yes    |
| region                       | GCP region                                 | `string` | n/a     |   yes    |
| enable_private_google_access | Enable Private Google Access on the subnet | `bool`   | `true`  |    no    |

## Outputs

| Name             | Description                     |
| ---------------- | ------------------------------- |
| network_id       | The ID of the VPC network       |
| network_name     | The name of the VPC network     |
| subnet_id        | The ID of the subnetwork        |
| subnet_self_link | The self link of the subnetwork |
