const express = require('express')
const port = 3000
const axios = require('axios')
var cors = require('cors')
var cookieParser = require('cookie-parser')
var Promise = require("bluebird");
const bodyParser = require('body-parser');
/**
 * Variables
 */
const baseUrl = 'https://www.pathofexile.com'

/**
 * Middlewares
 */
const app = express()
app.use(cors())
app.use(cookieParser())
app.use(bodyParser());

/**
 * Helper functions
 */
const getHeaders = (request) => {
  const poesessid = request.headers.poesessid ? `POESESSID=${request.headers.poesessid};` : '';
  return {
    Cookie: `${poesessid}`
  }
}

/** 
 * Api enpoints
*/
app.get('/', (request, response) => {

  axios.get(`${baseUrl}/character-window/get-characters?accountName=cloughax`)
    .then(data => {
      response.send(data.data);
    }).catch(error => {
      response.send(error.response.data);
    });

})
app.post('/get-item-value', (req, res) => {

  const item = req.body;
  // console.log(item);
  const itemSearchQuery = {
    query: {
      status: {
        option: "online"
      },
      type: item.typeLine
    },
    sort: {
      price: "asc"
    }
  }
  axios.post(
    `${baseUrl}/api/trade/search/Synthesis`,
    itemSearchQuery,
    {
      headers: getHeaders(req)
    }
  ).then(itemSearchQueryResponse => {
    if (itemSearchQueryResponse.data && itemSearchQueryResponse.data.result.length > 0) {
      return axios.get(
        `${baseUrl}/api/trade/fetch/${itemSearchQueryResponse.data.result[0]}?query=${itemSearchQueryResponse.data.id}`,
        itemSearchQuery
      ).then(fetchResponse => {
        res.send(fetchResponse.data);
      })
    } else {
      res.send([]);

    }
  }).catch(error => {
    res.send(error.response ? error.response.data : error);
  })
})

// Get items
app.get('/get-items', (req, res) => {
  const headers = getHeaders(req);
  const { accountName, character } = req.query;

  axios.get(
    `${baseUrl}/character-window/get-items`,
    {
      headers,
      params: {
        accountName,
        character
      }
    }
  ).then(searchResponse => {
    res.send(searchResponse.data);

  }).catch(error => {
    res.send(error.response ? error.response.data : error);
  });
})

// get characters
app.get('/get-characters', (request, response) => {
  const headers = getHeaders(request);
  const { character } = request.query;

  const params = {};

  if (character) {
    params.character = character;
  }

  axios.get(
    `${baseUrl}/character-window/get-characters`,
    {
      headers,
      params
    }
  ).then(data => {
    response.send(data.data);
  }).catch(error => {
    response.status(error.response.status).send(error.response.data);
  });
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }
  console.log(`server is listening on ${port}`)
})