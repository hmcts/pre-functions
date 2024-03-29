data "azurerm_key_vault_secret" "symmetrickey" {
  name         = "symmetrickey"
  key_vault_id = data.azurerm_key_vault.keyvault.id
}

data "azurerm_key_vault_secret" "client_secret" {
  name         = "client-secret"
  key_vault_id = data.azurerm_key_vault.keyvault.id
}

module "ams_function_app" {
  source              = "git@github.com:hmcts/pre-functions.git//modules/function_app?ref=preview"
  os_type             = "Linux"
  product             = var.product
  create_service_plan = true
  # private_endpoint_subnet_id = data.azurerm_subnet.endpoint_subnet.id

  resource_group_name = data.azurerm_resource_group.rg.name
  name                = "pre-ams-integration"
  location            = var.location
  common_tags         = var.common_tags
  env                 = var.env

  app_settings = {
    "ALGO"                              = "['RS256']"
    "AZURE_CLIENT_ID"                   = data.azuread_application.appreg.application_id
    "AZURE_MEDIA_SERVICES_ACCOUNT_NAME" = "preams${var.env}"
    "AZURE_TENANT_ID"                   = "531ff96d-0ae9-462a-8d2d-bec7c0b42082"
    "ISSUER"                            = "https://sts.windows.net/531ff96d-0ae9-462a-8d2d-bec7c0b42082/"
    "JWKSURI"                           = "https://login.microsoftonline.com/common/discovery/keys"
    "AUDIENCE"                          = "api://${data.azuread_application.appreg.application_id}"
    "SCOPE"                             = "api://${data.azuread_application.appreg.application_id}/.default"
    "CONTENTPOLICYKEYNAME"              = "PolicyWithClearKeyOptionAndJwtTokenRestriction"
    "STREAMINGPOLICYNAME"               = "PreStreamingPolicy"
    "TOKENENDPOINT"                     = "https://login.microsoftonline.com/531ff96d-0ae9-462a-8d2d-bec7c0b42082/oauth2/token"
    "AZURE_RESOURCE_GROUP"              = "pre-${var.env}"
    "AZURE_SUBSCRIPTION_ID"             = "${data.azurerm_subscription.current.subscription_id}"
    "AZURE_STORAGE_ACCOUNT_KEY"         = "${data.azurerm_storage_account.final_sa.primary_access_key}"
    "AZURE_STORAGE_ACCOUNT_NAME"        = "prefinalsa${var.env}"
    upper("PREINGESTSA${var.env}_KEY")  = "${data.azurerm_storage_account.ingest_sa.primary_access_key}"
    upper("PREFINALSA${var.env}_KEY")   = "${data.azurerm_storage_account.final_sa.primary_access_key}"
    "SYMMETRICKEY"                      = "${data.azurerm_key_vault_secret.symmetrickey.value}"
    "AZURE_CLIENT_SECRET"               = "${data.azurerm_key_vault_secret.client_secret.value}"
    "WEBSITE_ENABLE_SYNC_UPDATE_SITE"   = "false"
    "AMS_EVENT_LOGS_CONTAINER_NAME"     = "ams-event-logs"
    "STREAMING_LOCATOR_TTL"             = "420"
  }
}
