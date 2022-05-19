# Inventory Tracking Web App
## Quick Start
```
# Clone this repo

# Run the app
npm start

# Use a web browser to visit http://localhost:3000/
```

## Introduction
I created this app for Shopify's internship application coding challenge. The [task](https://docs.google.com/document/d/1cgmV2DW5mEOxhh5ekyopU4Cef07FNalP7WqAJdgpBuw/edit) is to create a basic inventory tracking web application with CRUD functionality, location tracking for products, and weather tracking in the locations of those products.

## Architectural Decisions
I used JavaScript for this application due to its popularity and ease of use. Express.js makes it easy to get a basic app running quickly.

The vast majority of interesting logic/code in this app is contained in the `/database/data-model.js` module. This module maps logical data structures (products, warehouses, and transactions) onto database tables (product, warehouse, inventory, transaction, and city). Any endpoints that access or update business data goes through `/database/data-model.js`.

`data-model.js` uses two interesting techniques to making retrieving weather data fast. Every product that is being viewed needs to retrieve weather data for every warehouse where it is stocked. This means that if there are n products each stocked in m warehouses, there are nxm requests for weather data.

**First**, `data-model.js` makes ample use of JavaScript's asynchonous features to allow for many weather requests to occur asynchronously. Weather requests for each product is queued up through a call to the asynchronous function `getWeatherForCity` and then `Promise.all()` is used to wait for all requests to complete.

**Second**, results from previous calls to the Open Weather API are cached through a technique called memoization that uses closures to store a private cache for a particular function. The default behaviour is to only make a new API call if the previously retrieved weather data is more than 30 minutes old.

## Dependencies
This repo contains the necessary dependencies. They are: [`ExpressJS`](https://www.npmjs.com/package/express) and [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) distrbuted by NPM.

This app uses the [Open Weather API](https://openweathermap.org/api).

I used `ExpressJS` for this project because it is quick and easy to use and doesn't include too many features I was not using. The coding challenge specified that an aesthetic presentation of the data was not required, so I opted not to use a front end frame work or write much CSS, but to use basic templating features provided by PUG to render HTML in the backend

I chose `better-sqlite3` as my SQLite API package because it is [much faster](https://www.npmjs.com/package/better-sqlite3) than sqlite3 and is simpler to use due to synchronous API calls.

## Disclaimers and Areas for Future Development
The error handling in this app is extremely poor. There is no feedback given to the user when a object creation, update, or deletion cannot be completed. There are certain scenarios that can make the app crash. Due to this being a simple coding challenge I have not taken the time to fix these issues, but it is an area for future development.