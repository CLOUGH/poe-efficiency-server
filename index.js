const express = require('express')
const port = 3000
const axios = require('axios')
var cors = require('cors')
var cookieParser = require('cookie-parser')

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

// Get items
app.get('/get-items', (request, response) => {  
  const headers = getHeaders(request);
  const {accountName, character} = request.query;
  axios.get(
    `${baseUrl}/character-window/get-items`,
    {
      headers,
      params: {
        accountName,
        character
      }
    }
  ).then(data => {
    response.send(data.data);
  }).catch(error => {
    response.send(error.response.data);
  });
})

// get characters
app.get('/get-characters', (request, response) => {
  const headers = getHeaders(request);
  const {character} = request.query;

  const params = {};

  if(character){
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