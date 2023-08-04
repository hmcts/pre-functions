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
