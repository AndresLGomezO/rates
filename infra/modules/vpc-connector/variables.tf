variable "connector_name" {
  description = "Name of the VPC connector"
  type        = string
}

variable "region" {
  description = "Region for the VPC connector"
  type        = string
}

variable "network" {
  description = "Name of the VPC network"
  type        = string
}

variable "ip_cidr_range" {
  description = "IP CIDR range for the connector (must be /28)"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 2
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 3
}

variable "machine_type" {
  description = "Machine type for the connector instances"
  type        = string
  default     = "e2-micro"
}
