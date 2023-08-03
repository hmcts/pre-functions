data "azurerm_resource_group" "rg" {
  name = "${var.product}-${var.env}"
}

data "azurerm_key_vault" "keyvault" {
  name                = var.env == "prod" ? "${var.product}-hmctskv-${var.env}" : "${var.product}-${var.env}"
  resource_group_name = data.azurerm_resource_group.rg.name
}

data "azurerm_subscription" "current" {}

data "azurerm_storage_account" "final_sa" {
  name                = "${var.product}finalsa${var.env}"
  resource_group_name = "${var.product}-${var.env}"
}

data "azurerm_storage_account" "ingest_sa" {
  name                = "${var.product}ingestsa${var.env}"
  resource_group_name = "${var.product}-${var.env}"
}

data "azuread_application" "appreg" {
  display_name = "dts_pre_${var.env}"
}