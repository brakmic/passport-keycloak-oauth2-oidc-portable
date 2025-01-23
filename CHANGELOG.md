# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.3.1](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.3.0...v2.3.1) (2025-01-23)

## [2.3.0](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.2.5...v2.3.0) (2025-01-23)


### Features

* attach id_token to user profile ([772c811](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/772c811f949de02747ac914cac86b01b0cc3b183))

### [2.2.5](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.2.4...v2.2.5) (2025-01-21)

### [2.2.4](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.2.2...v2.2.4) (2025-01-21)


### Bug Fixes

* make clientSecret optional for public clients in KeycloakStrategy ([091027f](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/091027fbf9d2ce24192978f0444b275a017fa02f))

### [2.2.3](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.2.2...v2.2.3) (2025-01-21)


### Bug Fixes

* make clientSecret optional for public clients in KeycloakStrategy ([091027f](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/091027fbf9d2ce24192978f0444b275a017fa02f))

### [2.2.2](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.2.1...v2.2.2) (2025-01-20)

### [2.2.1](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/compare/v2.2.0...v2.2.1) (2025-01-20)

## 2.2.0 (2025-01-20)


### Features

* add default name for keycloak server ([8a6a178](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/8a6a178f1d5c18bd7b2c40e084169c001130e9c5))
* add devcontainer support ([6ddc12a](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/6ddc12a3aded39854f5f799182c4a9fb0dfe2ae3))
* add more ports to devcontainer ([8d04c82](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/8d04c82d0d2b0815ef049ff04c28fff81316d429))
* add pkce support ([f5e3c4f](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/f5e3c4ff9b37eec8efbddbf65049e5335715371e))
* add pkce-support to tests and mock server ([6fa71ad](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/6fa71ad8502215c0e3882ec4d9be4c74f3ee0421))
* add pkce-support, improve tests, add samples ([ce36d44](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/ce36d44ff5099000a6f33f4422a277ab2804d71f))
* add ports to devcontainer ([98dde6a](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/98dde6aa2d033c60fdb8772178c2aa7debe31fee))
* add public-client sample ([aad7825](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/aad7825e77bdc763527966c4be93c7458d4dbad3))
* add run-scripts for mock-server ([910dda9](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/910dda99586849263bb5cf5665c017af1b002a82))
* improve configuration in strategy test ([2f1cb82](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/2f1cb8239e0a67ca82657ac553f34fcddc742b76))
* include integration tests in makefile ([f26f3f5](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/f26f3f5ae0fcd3bddd0aec5a28e32970ee30bcec))
* make mock-server configurable ([ccdfc30](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/ccdfc30d937cf30e69f59646b1ca78bb8e426cca))
* update makefile for jest ([2d8ad4a](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/2d8ad4a9cdbf969764c97bf81a5aa155f1db138f))
* update packages and run scripts ([ac1f2f8](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/ac1f2f8d3ce0d02c17bcd03cd816e828777b8bb0))
* update tests to mjs and use new keycloak urls ([8aac3f8](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/8aac3f820bf55966faa553983cf7ec8877988ce3))


### Bug Fixes

* add openid default scope ([322f019](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/322f0191aa1a3853dcafec12d7f35cc409abed06))
* add shared network for docker containers ([d5e7638](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/d5e7638002e8765a039db64bf845614300fd6ea3))
* corrected given_name to family_name in profile ([fa884f0](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/fa884f099d5337cfd0fe73dc5e2d6c7708f10e46))
* linting errors in strategy.js ([595cad1](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/595cad1070b8a090664c1aeaa6f972c069b30893))
* test - should include other specified scopes ([9ce18af](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/9ce18afba6d4dbd7ff113d324453e85f1d0c2c88))
* test - should throw error when publicClient=false but clientSecret=null ([34e2bf4](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/34e2bf4ffa5b69089432333f742c29146d6c49f8))
* test names in makefile ([52e668f](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/52e668fc53ca9e06d996aacb4fe304c59c7f1d59))
* test publicClient should be set to true ([10702a2](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/10702a20ecdd233eff8ce309e2de5de4db3c090e))
* use toContain instead of toBe in strategy tests ([5f988bf](https://github.com/brakmic/passport-keycloak-oauth2-oidc-portable/commit/5f988bf30c35025878a5fdb17981ef1553548b89))
