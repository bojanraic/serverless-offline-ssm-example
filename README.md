# Using SSM Parameter Store Params Locally/Offline in Serverless Framework  

## Use case

For serverless projects with functions which rely on many SSM Parameter Store parameters, it can be 
tedious to manage values locally. Some prefer to use `.env` files or similar plugins, but what if this can be further simplified? 

You can use SSM Params for environment variables offline/locally with a custom plugin included in `./plugins/offline-ssm`. 

Simply set Offline SSM params under `custom.offlineSSM`. You can also specify for which stages Offline SSM should apply. (`local` in the example below)

The benefit of this approach is that we can keep the `environment` blocks of our functions intact; we simply need to map local values with the same naming conventions, and we're done. 

Original implementation found in [this](https://github.com/janders223/serverless-offline-ssm/issues/145#issuecomment-850429523) Github comment. Tweaked to use `provider.stage` instead of `provider.profile`.  

## Offline-SSM Plugin

This local plugin intercepts AWS SSM's `getParameter` API calls and resolves them locally based on custom parameter mappings listed in `serverless.yml` 

See [./plugins/offline-ssm/index.js](./plugins/offline-ssm/index.js) for details.


## Full Example

### [serverless.yml](./serverless.yml) 
``` yaml

service: sls-offline-ssm-example
frameworkVersion: '2'
configValidationMode: error
variablesResolutionMode: 20210326

provider:
  name: aws
  runtime: nodejs14.x
  lambdaHashingVersion: 20201221  
  stage: ${opt:stage, 'local'}
  region: ${opt:region, 'us-east-1'}

plugins:
  - serverless-offline
  - ./plugins/offline-ssm

package:
  patterns:
    - '!./**'
    - 'src/**'

custom: 
  offlineSSM: 
    ${file(./config/offline-ssm.yml)}
  
functions:
  fun:
    handler: 
      src/handler.main
    events:
      - http:
         path: /
         method: get
    environment:
      PARAM_VALUE: ${ssm:/params/someparam}
```

In this setup, we exclude all but the `src/` folder from packaging as other files are not needed for the function to run on AWS. 

For convenience, SSM params can be loaded from a separate file. This is also a good practice as this file can be ommitted from version control. See the note at the end of this document.

### [config/offline-ssm.yml](./config/offline-ssm.yml) 
``` yaml
stages:
  - local
ssm:
  /params/someparam:
    Type: String
    Value: some-local-value
```

### [src/handler.js](./src/handler.js)
```javascript
'use strict';

module.exports.main = async () => {
  const paramvalue = process.env.PARAM_VALUE;
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `Your parameter value: ${paramvalue}`,
      },
      null,
      2
    ),
  };
};

```

## Invoke function locally: 
``` bash
sls invoke local -f fun
Serverless: Running "serverless" installed locally (in service node_modules)
{
    "statusCode": 200,
    "body": "{\n  \"message\": \"Your parameter value: some-local-value\"\n}"
}
offline: GET /local (λ: fun)
offline: (λ: fun) RequestId: ckqte2n1v00026v79bta64nre  Duration: 2.77 ms  Billed Duration: 3 ms
```

## Result: 

``` json
{
  "message": "Your parameter value: local-value"
}
```

## Running in other stages

If we run or invoke our code in stages other than `local`, SSM Params will try to be resolved from AWS. 
This means that if we deploy or invoke the code in a stage where SSM Param does not exist in AWS, we will get an error: 

```bash 
sls deploy --verbose -s QA
Serverless: Running "serverless" installed locally (in service node_modules)

 Serverless Error ----------------------------------------

  Cannot resolve serverless.yml: Variables resolution errored with:
    - Cannot resolve variable at "functions.fun.environment.PARAM_VALUE": Value not found at "ssm" source
```

After we add `/params/someparam` and set its value (to `some-aws-ssm-parameter-value`, for example) in AWS SSM Parameter Store, we can redeploy the project successfully: 

```bash
----
output clipped for brevity
----
Serverless: Stack update finished...
----
endpoints:
  GET - https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/
functions:
  fun: sls-offline-ssm-example-dev-fun
----
```
Finally, we can invoke our function **directly on AWS**: 
```bash
sls invoke -f fun -s dev
Serverless: Running "serverless" installed locally (in service node_modules)
{
    "statusCode": 200,
    "body": "{\n  \"message\": \"Your parameter value: some-aws-ssm-parameter-value\"\n}"
}
```

## **Note**

If your local parameter values include sensitive information, such as passwords, connection strings, etc, you can skip committing your local params file to version control. (using `.gitignore`, for example)