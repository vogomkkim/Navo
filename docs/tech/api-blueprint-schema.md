# API Blueprint Schema

This document defines the standard JSON schema for describing a backend API. The Navo AI Planner is responsible for generating a plan that conforms to this schema, and the Backend Code Generator tool is responsible for interpreting it to create functional server code.

---

## 1. Root Object

The root object of the API Blueprint.

-   **`blueprintType`** (string, required): Must be `"API_BLUEPRINT_V1"`. This allows for future versioning.
-   **`endpoints`** (array, required): An array of Endpoint Objects, each defining a single API endpoint.

---

## 2. Endpoint Object

Describes a single API endpoint (e.g., `/users`, `/products/:id`).

-   **`path`** (string, required): The URL path of the endpoint (e.g., `/users`, `/products/:productId`).
-   **`method`** (string, required): The HTTP method. Must be one of `GET`, `POST`, `PATCH`, `DELETE`.
-   **`description`** (string, required): A natural language description of what this endpoint does. This will be used by the code generator to understand the business logic.
-   **`request`** (Request Object, optional): Describes the expected request format.
-   **`response`** (Response Object, required): Describes the expected response format.

---

## 3. Request Object

Describes the incoming request.

-   **`params`** (object, optional): An object describing URL parameters. Keys are the parameter names (e.g., `productId`), and values are objects with a `type` (e.g., `string`, `number`) and `description`.
-   **`body`** (object, optional): An object describing the JSON request body. Keys are the field names, and values are objects with a `type` and `description`.

---

## 4. Response Object

Describes the outgoing response. It's an object where keys are HTTP status codes.

-   **`[statusCode]`** (object, required): An object whose key is a valid HTTP status code (e.g., `200`, `201`, `404`).
    -   **`description`** (string, required): A description of what this response means (e.g., "User found successfully", "User not found").
    -   **`body`** (object, optional): An object describing the JSON response body for this status code. Keys are field names, and values are objects with a `type` and `description`.

---

## 5. Example

Here is a complete example of an API Blueprint for a simple user API.

```json
{
  "blueprintType": "API_BLUEPRINT_V1",
  "endpoints": [
    {
      "path": "/users/:userId",
      "method": "GET",
      "description": "Retrieves the details of a specific user by their ID.",
      "request": {
        "params": {
          "userId": {
            "type": "string",
            "description": "The unique identifier of the user."
          }
        }
      },
      "response": {
        "200": {
          "description": "User details retrieved successfully.",
          "body": {
            "id": {
              "type": "string",
              "description": "User's unique ID."
            },
            "name": {
              "type": "string",
              "description": "User's full name."
            },
            "email": {
              "type": "string",
              "description": "User's email address."
            }
          }
        },
        "404": {
          "description": "The user with the specified ID was not found.",
          "body": {
            "error": {
              "type": "string",
              "description": "An error message."
            }
          }
        }
      }
    },
    {
      "path": "/users",
      "method": "POST",
      "description": "Creates a new user with the provided name and email.",
      "request": {
        "body": {
          "name": {
            "type": "string",
            "description": "The full name of the new user."
          },
          "email": {
            "type": "string",
            "description": "The email address of the new user."
          }
        }
      },
      "response": {
        "201": {
          "description": "User created successfully.",
          "body": {
            "id": {
              "type": "string",
              "description": "The ID of the newly created user."
            }
          }
        },
        "400": {
          "description": "Invalid input, such as a missing name or email.",
          "body": {
            "error": {
              "type": "string",
              "description": "An error message detailing what was wrong with the request."
            }
          }
        }
      }
    }
  ]
}
```
