variable "resource_group_name" {}

variable "name" {}

variable "location" {}

variable "app_settings" {
  type = map(string)
}

variable "os_type" {
  default = "Linux"
}

variable "product" {}

variable "common_tags" {}

variable "create_service_plan" {
  description = " If true a new service plan is created"
  default     = true
}

# variable "create_storage_account" {
#   description = " If true a new storage account is created"
#   default     = true
# }

variable "zip_deploy_file" {
  description = "The local path and filename to the zip file to deploy to the App Service."
  default     = null
}

variable "env" {}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID to attach private endpoint to - overrides the default subnet id"
  default     = null
}

variable "private_endpoint_name" {
  default = null
}