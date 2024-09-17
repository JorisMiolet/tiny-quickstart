/*
server.js – Configures the Plaid client and uses Express to defines routes that call Plaid endpoints in the Sandbox environment.Utilizes the official Plaid node.js client library to make calls to the Plaid API.
*/

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const app = express();

app.use(
  
  // Use an actual secret key in production
  session({ secret: "bosco", saveUninitialized: true, resave: true })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuration for the Plaid client
const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
      "Plaid-Version": "2020-09-14",
    },
  },
});

//Instantiate the Plaid client with the configuration
const client = new PlaidApi(config);

//Creates a Link token and return it
app.get("/api/create_link_token", async (req, res, next) => {
  const tokenResponse = await client.linkTokenCreate({
    user: { client_user_id: req.sessionID },
    client_name: "Plaid's Tiny Quickstart",
    language: "en",
    products: ["auth"],
    country_codes: ["US"],
    redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI,
  });
  res.json(tokenResponse.data);
});

// Exchanges the public token from Plaid Link for an access token
app.post("/api/exchange_public_token", async (req, res, next) => {
  const exchangeResponse = await client.itemPublicTokenExchange({
    public_token: req.body.public_token,
  });

  // FOR DEMO PURPOSES ONLY
  // Store access_token in DB instead of session storage
  req.session.access_token = exchangeResponse.data.access_token;
  res.json(true);
});

// Fetches balance data using the Node client library for Plaid
app.get("/api/balance", async (req, res, next) => {
  const access_token = req.session.access_token;
  console.log(access_token)
  const balanceResponse = await client.accountsBalanceGet({ access_token });
  res.json({
    Balance: balanceResponse.data,
  });
});

app.get("/api/getAccesToken", async (request, response, next) => {
  Promise.resolve().then(async () => {
      const accesToken = request.session.access_token
      if(!accesToken)return;
    
      response.json({access_token: accesToken })
    })
  })
  

app.post("/api/transactions", async (request, response, next) => {
  Promise.resolve().then(async () => {
    const access_token = request.session.access_token

    let cursor = null
  
    let added = [];
    let modified = [];
    let removed = [];
    let hasMore = true;

    let { count } = request.body;
    if(count < 1){
      return new Error('Count must be between 1 and 500')
    }

    while (hasMore) {
      const request = {
        access_token: access_token,
        cursor: cursor,
        count: parseInt(count),
        options: {
          days_requested: 30
        }
      };
      const response = await client.transactionsSync(request)
      const data = response.data;

      cursor = data.next_cursor;
      if (cursor === "") {
        continue;
      }

      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);
      hasMore = data.has_more;
    }
    if(count > added.length){
      count = added.length ;
    }

    const compareTxnsByDateAscending = (a, b) => (a.date > b.date) - (a.date < b.date);

        const recently_added = [...added].sort(compareTxnsByDateAscending).slice(-count);
        response.json({
          added: recently_added,
          modified: modified,
          removed: removed,
        });
  })
  
})

app.listen(process.env.PORT || 8080);
