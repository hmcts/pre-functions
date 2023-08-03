data "azurerm_resource_group" "rg" {
  name = "${var.product}-${var.env}"
}

data "azurerm_key_vault" "keyvault" {
  name                = var.env == "prod" ? "${var.product}-hmctskv-${var.env}" : "${var.product}-${var.env}"
  resource_group_name = data.azurerm_resource_group.rg.name
}
