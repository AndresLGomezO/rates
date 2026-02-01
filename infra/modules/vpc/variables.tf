variable "network_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "subnet_name" {
  description = "Name of the subnet"
  type        = string
}

variable "subnet_cidr" {
  description = "CIDR range for the subnet"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "enable_private_google_access" {
  description = "Enable Private Google Access on the subnet"
  type        = bool
  default     = true
}
