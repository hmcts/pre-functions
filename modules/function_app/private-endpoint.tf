locals {
  app_service_name = var.name == "" ? format("%s-%s", var.product, var.env) : var.name
}

# data "azurerm_private_dns_zone" "azurewebsites" {
#   provider            = azurerm.private_dns
#   name                = "privatelink.azurewebsites.net"
#   resource_group_name = "core-infra-intsvc-rg"
# }

resource "azurerm_private_endpoint" "this" {
  count = var.private_endpoint_subnet_id != null ? 1 : 0

  name                = var.private_endpoint_name == null ? "${local.app_service_name}-pe" : var.private_endpoint_name
  resource_group_name = var.resource_group_name
  location            = var.location
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = local.app_service_name
    is_manual_connection           = false
    private_connection_resource_id = azurerm_service_plan.this.id
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "endpoint-dnszonegroup"
    private_dns_zone_ids = ["/subscriptions/1baf5470-1c3e-40d3-a6f7-74bfbce4b348/resourceGroups/core-infra-intsvc-rg/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"]
  }

  tags = var.common_tags
}