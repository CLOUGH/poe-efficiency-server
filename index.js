const express = require('express')
const port = 3000
const axios = require('axios')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const Promise = require("bluebird");
const bodyParser = require('body-parser');
/**
 * Variables
 */
const baseUrl = 'https://www.pathofexile.com'

/**
 * Interceptors
 */


/**
 * Middlewares
 */
const app = express()
app.use(cors())
app.use(cookieParser())
app.use(bodyParser());

app.use((req, res, next) => {
  if(req.headers.poesessid) {
    const poesessid = req.headers.poesessid;
    axios.interceptors.request.use((config) => {
      config = {
        ...config,
        headers: {
          ...config.headers,
          Cookie: `${config.headers.Cookie?config.headers.Cookie:''}POESESSID=${poesessid};`
        }
      }
    
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }
  next();
})



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
app.get('/', (req, res) => {

  res.json({
    message: 'Welcome to path of efficiency api'
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
    itemSearchQuery
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
  const { accountName, character } = req.query;

  axios.get(
    `${baseUrl}/character-window/get-items`,{
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
  const { character } = request.query;
  const params = {};
  if (character) {
    params.character = character;
  }

  axios.get(
    `${baseUrl}/character-window/get-characters`,{
      params
    }
  ).then(data => {
    response.send(data.data);
  }).catch(error => {
    if(!error.response){
       response.status(500).send(error);
    } else{
      response.status(error.response.status).send(error.response.data);
    }
  });
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }
  console.log(`server is listening on ${port}`)
})