# pre-functions
Pre-Recorded Evidence Project - Function Apps

The infrastructure for PRE is brought up in 4 stages:
1. https://github.com/hmcts/pre-network
2. https://github.com/hmcts/pre-vault
3. https://github.com/hmcts/pre-shared-infrastructure
4. https://github.com/hmcts/pre-functions - YOU ARE HERE

## Getting started

The terraform version is managed by `.terraform-version` file in the root of the repo, you can update this whenever you want.

## Lint

Please run `terraform fmt` before submitting a pull request.

Documentation is kept up-to-date using terraform-docs.

We've included [pre-commit](https://pre-commit.com/) hooks to help with this.

Install it with:
```shell
$ brew install pre-commit
# or
$ pip3 install pre-commit
```

then run:
```command
$ pre-commit install
```

## Workflow

1. Make your changes locally
2. Format your change with `terraform fmt` or the pre-commit hook
3. Submit a pull request
4. Check the terraform plan from the build link that will be posted on your PR
5. Get someone else to review your PR
6. Merge the PR
7. It will automatically be deployed to AAT and Prod environments
8. Once successful in AAT and Prod then merge your change to demo, ithc, and perftest branches.

## LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | 3.75.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azuread"></a> [azuread](#provider\_azuread) | 2.50.0 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 3.75.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_ams_function_app"></a> [ams\_function\_app](#module\_ams\_function\_app) | git@github.com:hmcts/pre-functions.git//modules/function_app | preview |

## Resources

| Name | Type |
|------|------|
| [azuread_application.appreg](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application) | data source |
| [azurerm_key_vault.keyvault](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/key_vault) | data source |
| [azurerm_key_vault_secret.client_secret](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.symmetrickey](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/key_vault_secret) | data source |
| [azurerm_resource_group.rg](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/resource_group) | data source |
| [azurerm_storage_account.final_sa](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/storage_account) | data source |
| [azurerm_storage_account.ingest_sa](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/storage_account) | data source |
| [azurerm_subnet.endpoint_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/subnet) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/subscription) | data source |
| [azurerm_virtual_network.vnet](https://registry.terraform.io/providers/hashicorp/azurerm/3.75.0/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_common_tags"></a> [common\_tags](#input\_common\_tags) | n/a | `map(string)` | n/a | yes |
| <a name="input_env"></a> [env](#input\_env) | n/a | `any` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | n/a | `string` | `"UK South"` | no |
| <a name="input_product"></a> [product](#input\_product) | n/a | `string` | `"pre"` | no |

## Outputs

No outputs.
<!-- END_TF_DOCS -->