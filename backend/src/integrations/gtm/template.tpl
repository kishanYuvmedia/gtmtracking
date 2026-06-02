___TERMS_OF_SERVICE___

By creating or modifying this file, you agree to Google Tag Manager's Community
Template Gallery Developer Terms of Service available at
https://developers.google.com/tag-manager/gallery-tos

___INFO___

{
  "type": "TAG",
  "id": "cvt_gtm_tracking",
  "version": 1,
  "securityGroups": [],
  "displayName": "GTM Tracking - Event Collector",
  "brand": {
    "id": "brand_gtm_tracking",
    "displayName": "GTM Tracking",
    "thumbnail": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  },
  "description": "Send events to GTM Tracking server for processing and Meta Conversion API forwarding.",
  "containerContexts": ["WEB"]
}

___TEMPLATE_PARAMETERS___

[
  {
    "type": "TEXT",
    "name": "apiKey",
    "displayName": "API Key",
    "simpleValueType": true,
    "help": "Your GTM Tracking API key from the dashboard.",
    "valueValidators": [
      {
        "type": "NON_EMPTY"
      }
    ]
  },
  {
    "type": "TEXT",
    "name": "endpoint",
    "displayName": "Collector Endpoint",
    "simpleValueType": true,
    "defaultValue": "https://collect.domain.com",
    "help": "Your event collector server URL."
  },
  {
    "type": "SELECT",
    "name": "eventName",
    "displayName": "Event Name",
    "macrosInSelect": false,
    "selectItems": [
      { "value": "PageView", "displayValue": "Page View" },
      { "value": "Purchase", "displayValue": "Purchase" },
      { "value": "Lead", "displayValue": "Lead" },
      { "value": "AddToCart", "displayValue": "Add to Cart" },
      { "value": "InitiateCheckout", "displayValue": "Initiate Checkout" },
      { "value": "Signup", "displayValue": "Sign Up" },
      { "value": "Login", "displayValue": "Login" },
      { "value": "FormSubmit", "displayValue": "Form Submit" },
      { "value": "Click", "displayValue": "Click" }
    ],
    "simpleValueType": true
  },
  {
    "type": "GROUP",
    "name": "advancedGroup",
    "displayName": "Advanced Settings",
    "groupStyle": "ZIPPY_CLOSED",
    "subParams": [
      {
        "type": "TEXT",
        "name": "eventId",
        "displayName": "Event ID (for deduplication)",
        "simpleValueType": true
      },
      {
        "type": "TEXT",
        "name": "userEmail",
        "displayName": "User Email",
        "simpleValueType": true
      },
      {
        "type": "TEXT",
        "name": "orderValue",
        "displayName": "Order Value",
        "simpleValueType": true
      },
      {
        "type": "TEXT",
        "name": "currency",
        "displayName": "Currency",
        "simpleValueType": true,
        "defaultValue": "INR"
      },
      {
        "type": "CHECKBOX",
        "name": "debugMode",
        "displayName": "Enable Debug Mode",
        "simpleValueType": true
      }
    ]
  }
]

___SANDBOXED_JS_FOR_WEB_TEMPLATE___

const sendPixel = require('sendPixel');
const JSON = require('JSON');
const getTimestampMillis = require('getTimestampMillis');
const generateRandom = require('generateRandom');
const makeString = require('makeString');
const getRequestHeader = require('getRequestHeader');
const getCookieValues = require('getCookieValues');
const sendHttpRequest = require('sendHttpRequest');

const apiKey = data.apiKey;
const endpoint = data.endpoint;
const eventName = data.eventName;
const debugMode = data.debugMode;

const payload = {
  event_name: eventName,
  website_id: apiKey,
  session_id: data.gtmSessionId || makeString(generateRandom(100000, 999999)),
  visitor_id: data.gtmVisitorId || makeString(generateRandom(100000, 999999)),
  event_id: data.eventId || (eventName + '_' + getTimestampMillis()),
  payload: {}
};

if (data.userEmail) {
  payload.payload.email = data.userEmail;
}
if (data.orderValue) {
  payload.payload.value = parseFloat(data.orderValue);
}
if (data.currency) {
  payload.payload.currency = data.currency;
}

// Add URL and referrer
payload.payload.url = data.documentLocation || '';

if (debugMode) {
  payload.payload.debug = true;
}

const requestUrl = endpoint + '/api/collect';

sendHttpRequest(requestUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  },
}, JSON.stringify(payload))
  .then(() => {
    data.gtmOnSuccess();
  })
  .catch(() => {
    // Fallback to sendPixel if POST fails
    const fallbackUrl = endpoint + '/api/collect?' +
      'data=' + encodeURIComponent(JSON.stringify(payload));
    sendPixel(fallbackUrl, data.gtmOnSuccess, data.gtmOnFailure);
  });

___WEB_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "permissionId": "send_pixel",
        "name": "Send Pixel"
      }
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "permissionId": "access_globals",
        "name": "Access Global Variables"
      },
      "access": {
        "keys": [
          { "key": "documentLocation", "read": true, "write": false, "execute": false }
        ]
      }
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "permissionId": "access_globals",
        "name": "Access Global Variables"
      },
      "access": {
        "keys": [
          { "key": "gtmSessionId", "read": true, "write": false, "execute": false },
          { "key": "gtmVisitorId", "read": true, "write": false, "execute": false }
        ]
      }
    },
    "isRequired": false
  }
]
