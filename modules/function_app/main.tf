data "azurerm_resource_group" "rg" {
  name = "${var.product}-${var.env}"
}

data "azuread_application" "appreg" {
  display_name = "dts_pre_${var.env}"
}

resource "azurerm_service_plan" "this" {
  count               = var.create_service_plan ? 1 : 0
  name                = "${var.product}-asp-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = var.os_type #"Windows"
  sku_name            = "Y1"

  tags = var.common_tags
}

resource "azurerm_windows_function_app" "this" {
  count               = var.os_type == "Windows" ? 1 : 0
  name                = "${var.name}-${var.env}"
  resource_group_name = var.resource_group_name
  location            = var.location

  storage_account_name       = module.storage_account.storage_account_name
  storage_account_access_key = module.storage_account.storageaccount_primary_access_key
  service_plan_id            = azurerm_service_plan.this[0].id

  app_settings = var.app_settings
  https_only   = true

  tags = var.common_tags

  site_config {
    application_insights_connection_string = "InstrumentationKey=${module.application_insights.instrumentation_key};IngestionEndpoint=https://uksouth-0.in.applicationinsights.azure.com/"
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_linux_function_app" "this" {
  count               = var.os_type == "Linux" ? 1 : 0
  name                = "${var.name}-${var.env}"
  resource_group_name = var.resource_group_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.this.name
  storage_account_access_key = azurerm_storage_account.this.primary_access_key

  service_plan_id = azurerm_service_plan.this[0].id

  app_settings = var.app_settings
  https_only   = true

  tags = var.common_tags

  site_config {
    application_insights_connection_string = "InstrumentationKey=${module.application_insights.instrumentation_key};IngestionEndpoint=https://uksouth-0.in.applicationinsights.azure.com/"
    application_stack {
      node_version = "18"
    }
  }

  identity {
    type = "SystemAssigned"
  }

}

module "storage_account" {
  source                          = "git@github.com:hmcts/cnp-module-storage-account?ref=master"
  env                             = var.env
  storage_account_name            = replace("${var.name}${var.env}", "-", "")
  resource_group_name             = data.azurerm_resource_group.rg.name
  location                        = var.location
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  allow_nested_items_to_be_public = false
  enable_data_protection          = true
  restore_policy_days             = var.restore_policy_days
  enable_change_feed              = true
  managed_identity_object_id      = data.azurerm_user_assigned_identity.managed_identity.principal_id
  sa_subnets                      = concat([data.azurerm_subnet.jenkins_subnet.id], [data.azurerm_subnet.endpoint_subnet.id], [data.azurerm_subnet.datagateway_subnet.id], [data.azurerm_subnet.videoedit_subnet.id])
  containers                      = local.containers
  cors_rules = [{
    allowed_headers    = ["*"]
    allowed_methods    = ["GET", "OPTIONS"]
    allowed_origins    = ["https://hmcts${var.env}extid.b2clogin.com"]
    exposed_headers    = ["*"]
    max_age_in_seconds = 200
  }]

  role_assignments = [
    "Storage Blob Data Contributor"
  ]

  common_tags = var.common_tags
}

module "application_insights" {
  source = "git@github.com:hmcts/terraform-module-application-insights?ref=main"

  env     = var.env
  product = var.product
  name    = "${var.product}-${var.name}"

  resource_group_name = data.azurerm_resource_group.rg.name

  common_tags = var.common_tags
}
moved {
  from = azurerm_application_insights.appinsight
  to   = module.application_insights.azurerm_application_insights.this
}
