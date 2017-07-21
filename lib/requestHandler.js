'use strict'

const http = require('http'),
  https = require('https'),
  net = require('net'),
  url = require('url'),
  zlib = require('zlib'),
  color = require('colorful'),
  Buffer = require('buffer').Buffer,
  util = require('./util'),
  Stream = require('stream'),
  logUtil = require('./log'),
  co = require('co'),
  pug = require('pug'),
  HttpsServerMgr = require('./httpsServerMgr'),
  mysql = require('mysql'),
  Readable = require('stream').Readable,
  querystring = require('querystring');

// to fix issue with TLS cache, refer to: https://github.com/nodejs/node/issues/8368
https.globalAgent.maxCachedSessions = 0;

const error502PugFn = pug.compileFile(require('path').join(__dirname, '../resource/502.pug'));
const DEFAULT_CHUNK_COLLECT_THRESHOLD = 20 * 1024 * 1024; // about 20 mb
const DEFAULT_MOCK_SERVICE_HOSE = '/lich.mock_service'; // mock host
let requsetMockInfo = {};
let mockDbInfo = [];
let lichMockInfo = {};
const mockServiceHost = DEFAULT_MOCK_SERVICE_HOSE;

class CommonReadableStream extends Readable {
  constructor(config) {
    super({
      highWaterMark: DEFAULT_CHUNK_COLLECT_THRESHOLD * 5
    });
  }
  _read(size) {}
}

function connectMockEnv() {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    port: '3306',
    database: 'test',
  });

  connection.connect();
  return connection;
}


/**
 * fetch remote response
 *
 * @param {string} protocol
 * @param {object} options options of http.request
 * @param {buffer} reqData request body
 * @param {object} config
 * @param {boolean} config.dangerouslyIgnoreUnauthorized
 * @param {boolean} config.chunkSizeThreshold
 * @returns
 */
function fetchRemoteResponse(protocol, options, reqData, config) {
  reqData = reqData || '';
  return new Promise((resolve, reject) => {
    delete options.headers['content-length']; // will reset the content-length after rule
    delete options.headers['Content-Length'];
    options.headers['Content-Length'] = reqData.length; //rewrite content length info

    if (config.dangerouslyIgnoreUnauthorized) {
      options.rejectUnauthorized = false;
    }

    if (!config.chunkSizeThreshold) {
      throw new Error('chunkSizeThreshold is required');
    }
        //send request
    const proxyReq = (/https/i.test(protocol) ? https : http).request(options, (res) => {
      res.headers = util.getHeaderFromRawHeaders(res.rawHeaders);
            //deal response header
      const statusCode = res.statusCode;
      const resHeader = res.headers;
      let resDataChunks = []; // array of data chunks or stream
      let resDataStream = null;
      let resSize = 0;

      const finishCollecting = () => {
        new Promise((fulfill, rejectParsing) => {
          if (resDataStream) {
            fulfill(resDataStream);
          } else {
            const serverResData = Buffer.concat(resDataChunks);
            if (ifServerGzipped) {
              zlib.gunzip(serverResData, (err, buff) => { // TODO test case to cover
                if (err) {
                  rejectParsing(err);
                } else {
                  fulfill(buff);
                }
              });
            } else {
              fulfill(serverResData);
            }
          }
        }).then((serverResData) => {
          resolve({
            statusCode,
            header: resHeader,
            body: serverResData,
            _res: res,
          });
        }).catch(e => {
          reject(e);
        });
      };

            // remove gzip related header, and ungzip the content
            // note there are other compression types like deflate
      const contentEncoding = resHeader['content-encoding'] || resHeader['Content-Encoding'];
      const ifServerGzipped = /gzip/i.test(contentEncoding);
      if (ifServerGzipped) {
        delete resHeader['content-encoding'];
        delete resHeader['Content-Encoding'];
      }
      delete resHeader['content-length'];
      delete resHeader['Content-Length'];

      //deal response data
      res.on('data', (chunk) => {
        if (resDataStream) { // stream mode
          resDataStream.push(chunk);
          return;
        } else { // dataChunks
          resSize += chunk.length;
          resDataChunks.push(chunk);

          // stop collecting, convert to stream mode
          if (resSize >= config.chunkSizeThreshold) {
            resDataStream = new CommonReadableStream();
            while (resDataChunks.length) {
              resDataStream.push(resDataChunks.shift());
            }
            resDataChunks = null;
            finishCollecting();
          }
        }
      });

      res.on('end', () => {
        if (resDataStream) {
          resDataStream.emit('end'); // EOF
        } else {
          finishCollecting();
        }
      });
      res.on('error', (error) => {
        logUtil.printLog('error happend in response:' + error, logUtil.T_ERR);
        reject(error);
      });
    });

    proxyReq.on('error', reject);
    proxyReq.end(reqData);
  });
}

function findGetParameter(parameterName, query) {
  let result = null,
    tmp = [];
  query
    .split('&')
    .forEach((item) => {
      tmp = item.split('=');
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
  return result;
}

function filterPush(reqMockUrl) {
  for (const mockUrlInfo of requsetMockInfo.mockUrls) {
    if (reqMockUrl.url === mockUrlInfo.url) {
      requsetMockInfo.mockUrls.pop();
    }
  }
  requsetMockInfo.mockUrls.push(reqMockUrl);
}
function pushMockUrls(reqMockUrls) {
  if (Array.isArray(reqMockUrls)) {
    for (const reqMockUrl of reqMockUrls) {
      filterPush(reqMockUrl);
    }
  } else {
    filterPush(reqMockUrls);
  }
}

function handleLichBody(pathname) {
  let body;
  const routeUrl = pathname.split(mockServiceHost)[1];
  switch (routeUrl) {
    case '/db/connect': {
      body = JSON.stringify({
        code: 200,
        operate: pathname.split(mockServiceHost)[1],
        mock_urls: requsetMockInfo.mockUrls,
        mock_db_infos: mockDbInfo,
      });
      break;
    }
    case '/mock/add': {
      body = JSON.stringify({
        code: 200,
        operate: pathname.split(mockServiceHost)[1],
        mock_urls: requsetMockInfo.mockUrls,
      });
      break;
    }
    case '/db/add': {
      body = JSON.stringify({
        code: 200,
        operate: pathname.split(mockServiceHost)[1],
      });
      break;
    }
    default: {
      body = JSON.stringify({
        code: 200,
        operate: pathname.split(mockServiceHost)[1],
      });
      break;
    }
  }
  return body;
}


/**
 * get a request handler for http/https server
 *
 * @param {RequestHandler} reqHandlerCtx
 * @param {object} userRule
 * @param {Recorder} recorder
 * @returns
 */
function getUserReqHandler(userRule, recorder, sqlconn) {
  const reqHandlerCtx = this
  return function (req, userRes) {
      /*
       note
       req.url is wired
       in http  server: http://www.example.com/a/b/c
       in https server: /a/b/c
       */

    const host = req.headers.host;
    const protocol = (!!req.connection.encrypted && !(/^http:/).test(req.url)) ? 'https' : 'http';
    const fullUrl = protocol === 'http' ? req.url : (protocol + '://' + host + req.url);

    const urlPattern = url.parse(fullUrl);
    const path = urlPattern.path;
    const pathname = urlPattern.pathname;
    const chunkSizeThreshold = DEFAULT_CHUNK_COLLECT_THRESHOLD;
    let resourceInfo = null;
    let resourceInfoId = -1;
    let reqData;
    let requestDetail;
    let isLichHost = false;

    // refer to https://github.com/alibaba/anyproxy/issues/103
    // construct the original headers as the reqheaders
    req.headers = util.getHeaderFromRawHeaders(req.rawHeaders);
    logUtil.printLog(color.green(`received request to: ${req.method} ${host}${path}`));
    let postInfo = '';
    if (req.method === 'POST') {
      req.on('data', (chunk) => {
        postInfo += chunk;
      });

      req.on('end', () => {
        postInfo = querystring.parse(postInfo);
      });
    }


        /**
         * fetch complete req data
         */
    const fetchReqData = () => new Promise((resolve) => {
      const postData = [];
      req.on('data', (chunk) => {
        postData.push(chunk);
      });
      req.on('end', () => {
        reqData = Buffer.concat(postData);
        resolve();
      });
    });

        /**
         * prepare detailed request info
         */
    const prepareRequestDetail = () => {
      const options = {
        hostname: urlPattern.hostname || req.headers.host,
        port: urlPattern.port || req.port || (/https/.test(protocol) ? 443 : 80),
        path,
        method: req.method,
        headers: req.headers
      };

      requestDetail = {
        requestOptions: options,
        protocol,
        url: fullUrl,
        requestData: reqData,
        _req: req
      };
      return Promise.resolve();
    };

        /**
         * 检查是否需要mock数据
         * API MOCK :  127.0.0.1:8001/lich.mock_service/mock/add
         * HEAD: Mock-Data = {"url":"/login","type":"error"}
         * API CLEAR :  127.0.0.1:8001/lich.mock_service/mock/clear
         */
    const prepareLichRequst = () => {
      if (pathname.includes(mockServiceHost)) {
        isLichHost = true;
        const routeUrl = pathname.split(mockServiceHost)[1];
        switch (routeUrl) {
          case '/mock/clear': {
            logUtil.printLog(color.yellow('clear mock info'));
            requsetMockInfo = {};
            lichMockInfo = {};
            break;
          }
          case '/mock/add': {
            //request to mock
            // [{"url":"/login","type":"error"},{"url":"/order","type":"succes"}]
            requsetMockInfo.table = 'mock';
            //{url:"/login",type:"error"}
            const reqMockUrlsJ = req.headers['Mock-Data'];

            if (requsetMockInfo.mockUrls === undefined) {
              requsetMockInfo.mockUrls = [];
            }
            let directlyRespond = false;
            directlyRespond = urlPattern.query !== null && findGetParameter('directly', urlPattern.query) === 'true'
            const reqMockUrls = JSON.parse(reqMockUrlsJ);
            reqMockUrls.directlyRespond = directlyRespond;
            pushMockUrls(reqMockUrls);
            logUtil.printLog(color.yellow(`prepare to mock urls : ${JSON.stringify(requsetMockInfo.mockUrls)} --directly : ${directlyRespond}`));
            break;
          }
          case '/db/add': {
            logUtil.printLog(color.yellow('add data to db'));
            break;
          }
          default: {
            break;
          }
        }
      }
      return Promise.resolve();
    };

        /**
         * send response to client
         *
         * @param {object} finalResponseData
         * @param {number} finalResponseData.statusCode
         * @param {object} finalResponseData.header
         * @param {buffer|string} finalResponseData.body
         */
    const sendFinalResponse = (finalResponseData) => {
      const responseInfo = finalResponseData.response;
      if (!responseInfo) {
        throw new Error('failed to get response info');
      } else if (!responseInfo.statusCode) {
        throw new Error('failed to get response status code')
      } else if (!responseInfo.header) {
        throw new Error('filed to get response header');
      }

      userRes.writeHead(responseInfo.statusCode, responseInfo.header);
      const responseBody = responseInfo.body || '';
      if (global._throttle) {
        if (responseBody instanceof CommonReadableStream) {
          responseBody.pipe(global._throttle.throttle()).pipe(userRes);
        } else {
          const thrStream = new Stream();
          thrStream.pipe(global._throttle.throttle()).pipe(userRes);
          thrStream.emit('data', responseBody);
          thrStream.emit('end');
        }
      } else {
        if (responseBody instanceof CommonReadableStream) {
          responseBody.pipe(userRes);
        } else {
          userRes.end(responseBody);
        }
      }

      return responseInfo;
    }

    const mockResponseDirectly = function () {
      const newResponse = {};
      newResponse.header = {
        Connection: 'keep-alive',
        Server: 'LichMockServer',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Connection, User-Agent, Cookie'
      };
      newResponse.body = lichMockInfo.mockBody;
      newResponse.statusCode = lichMockInfo.mockStatusCode;
      return { response: newResponse };
    }

    const getMockDataFromSql = function (table, mockUrl, mockType) {
      const sqlFind = `SELECT * FROM ${table} WHERE INSTR(mock_url,'${mockUrl}')>0 AND mock_type = '${mockType}'`;
      return new Promise((resolve, reject) => {
        sqlconn.query(sqlFind, (err, rows) => {
          resolve(rows);
        })
      })
    }

    const fetchDb = function (table) {
      const sqlFind = `SELECT * FROM ${table}`;
      return new Promise((resolve, reject) => {
        sqlconn.query(sqlFind, (err, rows) => {
          resolve(rows);
        })
      })
    }

    const insertDb = function (table, insertInfo) {
      const sqlInsert = `INSERT INTO ${table} (mock_type, mock_url, mock_desc,mock_body,mock_status_code) VALUES (?,?,?,?,?);`;
      const insertParams = [insertInfo.mock_type, insertInfo.mock_url, insertInfo.mock_desc, insertInfo.mock_body, insertInfo.mock_status_code];
      return new Promise((resolve, reject) => {
        sqlconn.query(sqlInsert, insertParams, (err, rows) => {
          if (err) {
            logUtil.printLog(color.red('insert db error...'));
            return;
          }
          resolve(rows);
        })
      })
    }

        // fetch complete request data
    function handlerLichRequest() {
      return co.wrap(function* () {
        if (isLichHost) {
          const routeUrl = pathname.split(mockServiceHost)[1];
          switch (routeUrl) {
            case '/db/connect': {
              mockDbInfo = [];
              logUtil.printLog(color.yellow('connect db...'));
              const databaseInfo = req.headers.DataBase;
              logUtil.printLog(color.yellow('connect databaseInfo:' + databaseInfo));
              const dbResponse = (yield fetchDb('mock'));
              dbResponse.forEach((item, index, array) => {
                const rowInfo = {
                  mock_url: item.mock_url,
                  mock_type: item.mock_type,
                  mock_desc: item.mock_desc,
                  mock_body: item.mock_body,
                };
                mockDbInfo.push(rowInfo);
              });
              break;
            }
            case '/mock/add': {
              break;
            }
            case '/db/add': {
              const insertInfo = {
                mock_type: postInfo.mock_type,
                mock_url: postInfo.mock_url,
                mock_desc: postInfo.mock_desc,
                mock_body: postInfo.mock_body,
                mock_status_code: postInfo.mock_status_code,
              }
              const rows = yield getMockDataFromSql('mock', insertInfo.mock_url, insertInfo.mock_type)
              if (rows.length > 0) {
                logUtil.printLog(color.red('add data to db error , but this data  existed'));
                return;
              }
              yield insertDb('mock', insertInfo);
              break;
            }
            default: {
              break;
            }
          }
        }
      })
    }

    co(fetchReqData)
      .then(prepareRequestDetail)
      .then(prepareLichRequst)
      .then(handlerLichRequest())
            .then(() => {
                // record request info
              if (recorder) {
                resourceInfo = {
                  host,
                  method: req.method,
                  path,
                  protocol,
                  url: protocol + '://' + host + path,
                  req,
                  startTime: new Date().getTime()
                };
                resourceInfoId = recorder.appendRecord(resourceInfo);
              }

              try {
                resourceInfo.reqBody = reqData.toString(); //TODO: deal reqBody in webInterface.js
                recorder && recorder.updateRecord(resourceInfoId, resourceInfo);
              } catch (e) { }
            })

            // invoke rule before sending request
            .then(co.wrap(function*() {
              const userModifiedInfo = (yield userRule.beforeSendRequest(Object.assign({}, requestDetail))) || {};
              const finalReqDetail = {};
              ['protocol', 'requestOptions', 'requestData', 'response'].map((key) => {
                finalReqDetail[key] = userModifiedInfo[key] || requestDetail[key]
              });
              return finalReqDetail;
            }))
            // check is mock response
            .then(co.wrap(function*(userConfig) {
              if (isLichHost) {
                userConfig.response = {
                  statusCode: 200,
                  header: {
                    Connection: 'keep-alive',
                    Server: 'LichMockServer',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Connection, User-Agent, Cookie'
                  },
                  body: handleLichBody(pathname)
                };
                return userConfig;
              }
              let mockUrl;
              let mockType;
              let matched = false;
              let mockDirectlyRespond = false;
              if (requsetMockInfo.mockUrls !== undefined && requsetMockInfo.mockUrls.length !== 0) {
                for (const mockUrlInfo of requsetMockInfo.mockUrls) {
                  if (fullUrl.includes(mockUrlInfo.url)) {
                    logUtil.printLog(color.yellow(`match url: [${path}], query the database for response`));
                    mockUrl = mockUrlInfo.url;
                    mockType = mockUrlInfo.type;
                    mockDirectlyRespond = mockUrlInfo.directlyRespond
                    matched = true;
                    break;
                  }
                }
              }
              if (matched) {
                    //mock data from database
                const rows = yield getMockDataFromSql(requsetMockInfo.table, mockUrl, mockType);
                if (rows.length <= 0) {
                  logUtil.printLog(color.red(`want mock url: [${path}], but query the database NO response, check type: [ ${mockType} ]  is correct`));
                  return userConfig;
                } else if (rows.length > 1) {
                  logUtil.printLog(color.red(`want mock url: [${path}], but query the database has multiple response`));
                  return userConfig;
                }
                lichMockInfo.mockBody = rows[0].mock_body;
                lichMockInfo.mockUrl = rows[0].mock_url;
                lichMockInfo.mockStatusCode = rows[0].mock_status_code;
                lichMockInfo.mockDesc = rows[0].mock_desc;
                userConfig._isNeedToMock = true;
                userConfig._mockDirectlyRespond = mockDirectlyRespond;
                logUtil.printLog(color.yellow(`mock body from database : [${lichMockInfo.mockBody}]`));
                return userConfig;
              }

              return userConfig;
            }))

            // route user config or mock
            .then(co.wrap(function*(userConfig) {
              if (userConfig.response) {
                    // user-assigned local response
                userConfig._directlyPassToRespond = true;
                return userConfig;
              } else if (userConfig._isNeedToMock) {
                //需要mock返回数据
                if (userConfig._mockDirectlyRespond) {
                  //直接mock
                  logUtil.printLog(color.yellow('mock response directly'));
                  return mockResponseDirectly();
                } else {
                  //先fetch接口
                  logUtil.printLog(color.yellow('mock response with fetch'));
                  const remoteResponse = yield fetchRemoteResponse(userConfig.protocol, userConfig.requestOptions, userConfig.requestData, {
                    dangerouslyIgnoreUnauthorized: reqHandlerCtx.dangerouslyIgnoreUnauthorized,
                    chunkSizeThreshold,
                  });
                  return {
                    response: {
                      statusCode: lichMockInfo.mockStatusCode,
                      header: remoteResponse.header,
                      body: lichMockInfo.mockBody
                    },
                    _res: remoteResponse._res,
                  };
                }
              } else if (userConfig.requestOptions) {
                const remoteResponse = yield fetchRemoteResponse(userConfig.protocol, userConfig.requestOptions, userConfig.requestData, {
                  dangerouslyIgnoreUnauthorized: reqHandlerCtx.dangerouslyIgnoreUnauthorized,
                  chunkSizeThreshold,
                });
                return {
                  response: {
                    statusCode: remoteResponse.statusCode,
                    header: remoteResponse.header,
                    body: remoteResponse.body
                  },
                  _res: remoteResponse._res,
                };
              } else {
                throw new Error('lost response or requestOptions, failed to continue');
              }
            }))

            // invoke rule before responding to client
            .then(co.wrap(function*(responseData) {
              if (responseData._directlyPassToRespond) {
                return responseData;
              } else if (responseData.response.body && responseData.response.body instanceof CommonReadableStream) { // in stream mode
                return responseData;
              } else {
                return responseData;
              }
            }))

            .catch(co.wrap(function*(error) {
              logUtil.printLog(util.collectErrorLog(error), logUtil.T_ERR);
              let content;
              try {
                content = error502PugFn({
                  error,
                  url: fullUrl,
                  errorStack: error.stack.split(/\n/)
                });
              } catch (parseErro) {
                content = error.stack;
              }
                // default error response
              let errorResponse = {
                statusCode: 500,
                header: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'Proxy-Error': true,
                  'Proxy-Error-Message': error || 'null'
                },
                body: content
              };

                // call user rule
              try {
                const userResponse = yield userRule.onError(Object.assign({}, requestDetail), error);
                if (userResponse && userResponse.response && userResponse.response.header) {
                  errorResponse = userResponse.response;
                }
              } catch (e) {}

              return {
                response: errorResponse
              };
            }))
            .then(sendFinalResponse)
            //update record info
            .then((responseInfo) => {
              resourceInfo.endTime = new Date().getTime();
              resourceInfo.res = { //construct a self-defined res object
                statusCode: responseInfo.statusCode,
                headers: responseInfo.header,
              };
              resourceInfo.statusCode = responseInfo.statusCode;
              resourceInfo.resHeader = responseInfo.header;
              resourceInfo.resBody = responseInfo.body instanceof CommonReadableStream ? '(big stream)' : (responseInfo.body || '');
              resourceInfo.length = resourceInfo.resBody.length;
              recorder && recorder.updateRecord(resourceInfoId, resourceInfo);
            });
  }
}

/**
 * get a handler for CONNECT request
 *
 * @param {RequestHandler} reqHandlerCtx
 * @param {object} userRule
 * @param {Recorder} recorder
 * @param {object} httpsServerMgr
 * @returns
 */
function getConnectReqHandler(userRule, recorder, httpsServerMgr) {
  const reqHandlerCtx = this;
  reqHandlerCtx.conns = new Map();
  reqHandlerCtx.cltSockets = new Map()

  return function (req, cltSocket, head) {
    const host = req.url.split(':')[0],
      targetPort = req.url.split(':')[1];

    let shouldIntercept;
    let requestDetail;
    const requestStream = new CommonReadableStream();

      /*
       1. write HTTP/1.1 200 to client
       2. get request data
       3. tell if it is a websocket request
       4.1 if (websocket || do_not_intercept) --> pipe to target server
       4.2 else --> pipe to local server and do man-in-the-middle attack
       */
    co(function *() {
            // determine whether to use the man-in-the-middle server
      logUtil.printLog(color.green('received https CONNECT request ' + host));
      if (reqHandlerCtx.forceProxyHttps) {
        shouldIntercept = true;
      } else {
        requestDetail = {
          host: req.url,
          _req: req
        };
        shouldIntercept = yield userRule.beforeDealHttpsRequest(requestDetail);
      }
    })
            .then(new Promise(resolve => {
                // mark socket connection as established, to detect the request protocol
              cltSocket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', resolve);
            }))
            .then(new Promise((resolve, reject) => {
              let resolved = false;
              cltSocket.on('data', chunk => {
                requestStream.push(chunk);
                if (!resolved) {
                  resolved = true;
                  try {
                    const chunkString = chunk.toString();
                    if (chunkString.indexOf('GET ') === 0) {
                      shouldIntercept = false; //websocket
                    }
                  } catch (e) {}
                  resolve();
                }
              });
              cltSocket.on('end', () => {
                requestStream.push(null);
              });
            }))
            .then(() => {
                // log and recorder
              if (shouldIntercept) {
                logUtil.printLog('will forward to local https server');
              } else {
                logUtil.printLog('will bypass the man-in-the-middle proxy');
              }

                //record
                // resourceInfo = {
                //   host,
                //   method: req.method,
                //   path: '',
                //   url: 'https://' + host,
                //   req,
                //   startTime: new Date().getTime()
                // };
                // resourceInfoId = recorder.appendRecord(resourceInfo);
            })
            .then(() => {
                // determine the request target
              if (!shouldIntercept) {
                return {
                  host,
                  port: (targetPort === 80) ? 443 : targetPort,
                }
              } else {
                return httpsServerMgr.getSharedHttpsServer().then(serverInfo => ({ host: serverInfo.host, port: serverInfo.port }));
              }
            })
            .then((serverInfo) => {
              if (!serverInfo.port || !serverInfo.host) {
                throw new Error('failed to get https server info');
              }

              return new Promise((resolve, reject) => {
                const conn = net.connect(serverInfo.port, serverInfo.host, () => {
                        //throttle for direct-foward https
                  if (global._throttle && !shouldIntercept) {
                    requestStream.pipe(conn);
                    conn.pipe(global._throttle.throttle()).pipe(cltSocket);
                  } else {
                    requestStream.pipe(conn);
                    conn.pipe(cltSocket);
                  }

                  resolve();
                });

                conn.on('error', (e) => {
                  reject(e);
                });

                reqHandlerCtx.conns.set(serverInfo.host + ':' + serverInfo.port, conn)
                reqHandlerCtx.cltSockets.set(serverInfo.host + ':' + serverInfo.port, cltSocket)
              });
            })
            .then(() => {
                // resourceInfo.endTime = new Date().getTime();
                // resourceInfo.statusCode = '200';
                // resourceInfo.resHeader = {};
                // resourceInfo.resBody = '';
                // resourceInfo.length = 0;

                // recorder && recorder.updateRecord(resourceInfoId, resourceInfo);
            })
            .catch(co.wrap(function *(error) {
              logUtil.printLog(util.collectErrorLog(error), logUtil.T_ERR);

              try {
                yield userRule.onConnectError(requestDetail, error);
              } catch (e) { }

              try {
                let errorHeader = 'Proxy-Error: true\r\n';
                errorHeader += 'Proxy-Error-Message: ' + (error || 'null') + '\r\n';
                errorHeader += 'Content-Type: text/html\r\n';
                cltSocket.write('HTTP/1.1 502\r\n' + errorHeader + '\r\n\r\n');
              } catch (e) { }
            }));
  }
}

class RequestHandler {

    /**
     * Creates an instance of RequestHandler.
     *
     * @param {object} config
     * @param {boolean} config.forceProxyHttps proxy all https requests
     * @param {boolean} config.dangerouslyIgnoreUnauthorized
     * @param {object} rule
     * @param {Recorder} recorder
     *
     * @memberOf RequestHandler
     */
  constructor(config, rule, recorder) {
    const reqHandlerCtx = this;
    this.sqlConn = connectMockEnv();
    if (config.forceProxyHttps) {
      this.forceProxyHttps = true;
    }
    if (config.dangerouslyIgnoreUnauthorized) {
      this.dangerouslyIgnoreUnauthorized = true;
    }
    const default_rule = util.freshRequire('./rule_default');
    const userRule = util.merge(default_rule, rule);


    reqHandlerCtx.userRequestHandler = getUserReqHandler.apply(reqHandlerCtx, [userRule, recorder, this.sqlConn]);

    reqHandlerCtx.httpsServerMgr = new HttpsServerMgr({
      handler: reqHandlerCtx.userRequestHandler
    });

    this.connectReqHandler = getConnectReqHandler.apply(reqHandlerCtx, [userRule, recorder, reqHandlerCtx.httpsServerMgr])
  }
}


module.exports = RequestHandler;
