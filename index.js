const express = require('express')
const axios = require('axios')

const cors = require('cors')
const cookieParser = require('cookie-parser')
const Promise = require("bluebird");
const bodyParser = require('body-parser');
const { setupCache } = require('axios-cache-adapter');
const moment = require('moment');


/**
 * Config
 */
// Constants
const PORT = 8080;
const HOST = '0.0.0.0';


let poesessid = '';
/**
 * Variables
 */
const baseUrl = 'https://www.pathofexile.com'

/**
 * Cache
 */

// Create `axios-cache-adapter` instance
const cache = setupCache({
  maxAge: 15 * 60 * 1000
})

// Create `axios` instance passing the newly created `cache.adapter`
const api = axios.create({
  adapter: cache.adapter
})

/**
 * Interceptors
 */
api.interceptors.request.use((config) => {
  config = {
    ...config,
    metaData: {
      startTime: Date.now(),
    },
    headers: {
      ...config.headers,
      Cookie: `${config.headers.Cookie ? config.headers.Cookie : ''}POESESSID=${poesessid};`
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


api.interceptors.response.use((response) => {
  // Do something with response data
  const duration = moment().diff(moment(response.config.metaData.startTime), 'milliseconds');
  console.log(`axios ${response.config.method.toUpperCase()} ${response.config.url} ${duration}ms`);
  return response;
}, (error) => {
  // Do something with response error
  // console.error(error);
  // const duration = moment().diff(moment(response.config.metaData.startTime), 'milliseconds');
  // console.log(`axios ${response.config.method.toUpperCase()} ${response.config.url} ${duration}ms`);
  return Promise.reject(error);
})

/**
 * Middlewares
 */
const app = express()
app.use(cors())
app.use(cookieParser())
app.use(bodyParser());

app.use((req, res, next) => {
  if (req.headers.poesessid) {
    poesessid = req.headers.poesessid;

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
app.post('/get-similar-items', async (req, res) => {

  const item = req.body;
  const leauge = req.param('leauge');

  //get stats for query
  const stats = await api.get(`${baseUrl}/api/trade/data/stats`).then(stats => stats.data);
  // console.log(stats.result.length);
  //find explicit mods
  let explicitModFilters = []
  if (item.explicitMods) {
    explicitModFilters = stats.result
      .find(statType => statType.label == 'Explicit')
      .entries
      .filter(stat => {
        if(stat.text.match('\\+', '\\+')){
          const test = stat.text.replace('+', '').replace(/#/g, '\\d+');
          console.log(test);
        }
        let regexText = stat.text.replace('+', '').replace(/#/g, '\\d+')
        regexText = `${regexText}$`;
        const regex = new RegExp(regexText, 'g');
        for (let i = 0; i < item.explicitMods.length; i++) {
          if (item.explicitMods[i].match(regex)) {
            return true;
          };

        }
        return false;
      })
      .map(stat => ({ id: stat.id }));
    // explicitModFilters.push(explicitModFilter);
  }

  const type = { type: item.typeLine };
  let categoryFilter = {};
  for (const key in item.category) {
    if (item.category.hasOwnProperty(key)) {
      let categoryGroup = key;
      console.log(categoryGroup);
      switch (key) {
        case 'gems':
          categoryGroup = 'gem'
          break;
        case 'accessories':
          categoryGroup = 'accessory'
          break;
        case 'weapons':
          categoryGroup = 'weapon'
          break;
        case 'maps':
          categoryGroup = 'map'
          break;
        case 'jewels':
          categoryGroup = 'jewel'
          break;
        case 'flasks':
          categoryGroup = 'flask'
          break;
      }
      categoryFilter = {
        category: {
          option: categoryGroup + (item.category[key].length > 0 ? "." + item.category[key][0] : "")
        }
      };
      break;
    }
  }
  let rairity = {}
  switch (item.frameType) {
    case 0:
      rairity = {
        rarity: {
          option: "normal"
        }
      };

      break;
    case 1:
      rairity = {
        rarity: {
          option: "magic"
        }
      };

      break;
    case 2:
      rairity = {
        rarity: {
          option: "rare"
        }
      };
      break;
    case 3:
      rairity = {
        rarity: {
          option: "unique"
        }
      };
      break;
    default:
      break;
  }

  const itemLevel = {
    filters: {
      ilvl: {
        min: item.ilvl
      }
    }
  }
  const tradeQuery = {
    query: {
      status: {
        option: "online"
      },
      stats: [
        {
          type: "and",
          filters: [
            ...explicitModFilters
          ]
        }
      ],
      filters: {
        misc_filters: {
          ...itemLevel
        },
        type_filters: {
          filters: {
            ...categoryFilter,
            ...rairity
          }
        }
      },
      // ...type
    },
    sort: {
      price: "asc"
    }
  }
  console.log(JSON.stringify(tradeQuery));
  console.log(JSON.stringify(item.category));

  // get trade data summary
  api.post(`${baseUrl}/api/trade/search/${leauge}`, tradeQuery).then(({ data: searchData }) => {
    if (searchData.result.length > 0) {
      const selectList = searchData.result
        .filter((data, index) => index < 10)
        .map(itemId => itemId)
        .join(",")

      // get the detail of trade data
      return api.get(`${baseUrl}/api/trade/fetch/${selectList}?query=${searchData.id}`)
        .then(({ data: tradeData }) => {
          res.send({
            ...tradeData,
            link: `${baseUrl}/trade/search/${leauge}/${searchData.id}`
          });
        })
        .catch((error) => {
          // console.error(error)
          res.status(error.response.status).json(error.response.data);
        })
    } else {
      console.log('no data');
      res.send({
        link: `${baseUrl}/trade/search/${leauge}/${searchData.id}`
      });
    }
  }).catch(error => {
    // console.error(error)
    res.send(error.response ? {
      ...error.response.data,
    } : error);
  })
})

// Get items
app.get('/get-items', (req, res) => {
  const { accountName, character } = req.query;

  api.get(
    `${baseUrl}/character-window/get-items`, {
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

  api.get(
    `${baseUrl}/character-window/get-characters`, {
      params
    }
  ).then(data => {
    response.send(data.data);
  }).catch(error => {
    if (!error.response) {
      response.status(500).send(error);
    } else {
      response.status(error.response.status).send(error.response.data);
    }
  });
})


// trade data
app.get('/poe-static-data', (req, res) => {
  api.get(`${baseUrl}/api/trade/data/static`).then(({ data }) => {
    res.send(data.result);
  }).catch(error => {
    if (!error.response) {
      res.status(500).send(error);
    } else {
      res.status(error.response.status).send(error.response.data);
    }
  });
})

app.listen(PORT, HOST, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }
  console.log(`server is listening on ${PORT}`)
})