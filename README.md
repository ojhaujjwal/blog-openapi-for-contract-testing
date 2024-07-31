OpenAPI for Contract Testing
===================================

OpenAPI, former known as Swagger, is a a specification, usually expressed in JSON and YML, that describes how your API looks and behaves like. 

It's a very powerful tool which I don't believe is used as much as it should.  Most people I have talked to think that it's just a way to generate API documentation. 
I also remember talking to people who are not in love with OpenAPI because it gets outdated over time. People may change the API and forget to modify or re-generate the openapi spec. And voila! you have an OpenAPI spec which doesn't even represent how your API actually behaves. Your API clients find that the OpenAPI spec you have is merely a representation of how your API looked at some point in the past and you are back to the old-fashioned way of sharing the details about your API via slack messages.

I am here to tell you that you can ensure your OpenAPI is **never** out of sync with how your API actually behaves. You could take it even a few step further and use it for contract testing.

## Ensuring OpenAPI spec is always in sync with your API

Once you are ready to go down this route, there are a lot of ways to achieve this. One of the simples approach is integrating an OpenAPI validator in a language of your choice and validating requests and responses. 

I will show you a simple example for a node's [express](https://expressjs.com) based API using [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator). Before I show you the code, I will list down some slightly opinionated choices that I have made about the validator.

1. If the request doesn't pass the OpenAPI spec, it should be 4xx response. This will reduce burden on request validation layer and reduce validation logic you have to write. I will touch more on this later on.
2. If the response generated by the the API server doesn't pass the OpenAPI spec, it will be a hard 5xx response. Some people may frown at this idea, but I will share my reasoning later on.


## TODO: include middleware and link to the example repo

You can also run an OpenAPI proxy like prism so you can do the request and response validation outside your application.

### TODO: diagram for prism


### Why did I choose 400 for request matching the OpenAPI spec
If you are really trying to use OpenAPI to it's full capability, your clients should ideally use OpenAPI spec as the first class citizen for integrating to your API. You may not able to control this if you have a public API, but you may have a say on this if you are exposing API to consumers at least within your company.
I think it's totally fair to respond with 4xx because the client didn't meet the **contract** when sending the request. `400 Bad Request` means the server recived a request which it couldn't really understand or parse. 


## Using OpenAPI generated API client
When I say "OpenAPI as first class citizen for integration", it doesn't mean just using OpenAPI spec generated Swagger documentation. Your API consumers can use the OpenAPI for API client generation using tools like [openapi-generator](https://github.com/OpenAPITools/openapi-generator) for most languages. Here's an example way to generate API client for php and JS. 

```sh
curl https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json > stripe-openapi.json

openapi-generator generate -i ./stripe-openapi.json -g php-nextgen
openapi-generator generate -i ./stripe-openapi.json -g js
```

Using a generated API client would shift the responsibility of validation from runtime to static time. If your API clients use any form of pre-production static code analyzer and code linters, they could detect request not being valid in static time.

TODO: example of method not exists using SDK

Another option is to send the raw requests manually but you could validate the the requests at runtime using openapi request validation libraries. For example:
```
// todo; parse request to a openapi serber
```

When not using the openapi sdk, this is pretty crucial, specially if the API clients have enough automated tests where tests would fail if the request doesn't match the contract defined in OpenAPI spec and the mocked response are also validated against the OpenAPI spec.

## Achieving Contract testing with OpenAPI spec
If you have come this far, I imagine you are doing all of the things:
- In the API server, you have some form of OpenAPI validation implemented in the server for both the incoming requests and the outgoing response.
- In the API clients, you are either using the generated clients or using the openapi validator libraries for both request validation and response mock validation with enough automated test coverage.

This enables you to release your cliets and backend to deploy seperately without running a full range of E2E tests which are much slower and predictable in nature. 
That's basically contract testing. As long as both the server and the client abide to agree the contract in OpenAPI spec, they can deploy and release independantly.


## Detecting breaking API changes
TODO: document how to use open

## Strict(ify) your schema
Make the schema in your OpenAPI spec as strict and explicit as you can. Here's an example of a loosely defined schema that leaves a lot of loose ends.
```json
  // ...... rest of your spec
  "components": {
    "schemas": {
      "Wallet": {
        "type": "object",
        "properties": {
          "name": {
              "type": "string",
          },
          "description": {
              "type": "string",
          },
          "type": {
              "type": "string"
          },
          "colour_code": {
              "type": "string"
          }
        }
      }
    }
  }
```

There's are a few problems with the above field
1. There's not enough information on what are the required fields. By default, all the fields are optional and will pass validation against the schema without any of the fields.
2. Looks like type and colour_code are enum types, but there's not enough information on what are the allowed values of both of those fields.
3. Min and max value for fields like name aren't specified? Can the API client send a full 500 words essay as wallet name? I would imagine that it should not be allowed.

The above OpenAPI spec may be good enough just for documentation purpose but it's not enough for contract testing. Let me show you how you can make the above schema more explicit:

```json
  // ...... rest of your spec
  "components": {
    "schemas": {
      "Wallet": {
        "type": "object",
        "required": [ // required fields are mentioned here
            "name",
            "type",
            "colour_code"
        ],
        "properties": {
          "name": {
              "type": "string",
              "maxLength": 50, // max length allowed for name
              "minLength": 1 // min length allowed for name, empty string is not allowed
          },
          "description": {
              "type": "string",
              "maxLength": 255
          },
          "type": {
              "enum": [
                  "Travel", // enum can be used for indicating supported values
                  "HouseholdExpenses",
                  "Event",
                  "Other"
              ],
              "type": "string"
          },
          "colour_code": {
              "enum": [
                  "Red",
                  "Blue",
                  "Green"
              ],
              "type": "string"
          }
        }
      }
    }
  }
```


You may ask what's the point of making it more strict. Imagine you are receiving wallet under response body while calling `GET /wallets/:id`. You can be certain that what fields will surely be there and what not. You can have more strict typing in client side if you are using a programming language supporting static types.

```ts
const response = await fetch('http://api.example.com/wallets/10')

if (!response.ok) {
  throw new Error(`Error Response with status: ${response.status}`);
}

const body = await response.json();

const title: string = body.colour_code;
const description: string | null = body.description;

enum ColourCode {
  RED = 'Red',
  BLUE = 'Blue',
  GREEN = 'Green',
}

const colourCode: ColourCode = body.colour_code;
```