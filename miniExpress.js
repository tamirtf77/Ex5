var net = require('net');
var fs = require('fs');
var p = require('path');
var qs = require('querystring');
var http = require("./miniHttp");
var url = require("url");

var SPACE = ' ';
var HOST = 'host';
var HTTPS = 'x-forwarded-proto';

function miniExpress()
{
	var queue = [];
	var that = this;

	function request(HttpHeaders,HttpMethod)
	{
		var headers = HttpHeaders;
		headers['Allow'] = HttpMethod;
		var that = this;
		this.params = {};
		this.query = {};
		this.body = {};
		this.cookies = {};
		this.path = ""; //returns the url pathname example.com/users>sort=desc -> /users
		this.host = ""; // returns hostname header field without port
		this.protocol = ""; //returns http or https
		this.get = function(field){ // get the case-insensitive request header field. req.get('Content-Type'): -> text/plain
			for (var key in headers)
			{
				if (key.toLowerCase() === field.toLowerCase())
				{
					return headers[key];
				}
			}
			return undefined;
		};
		
		this.param = function(name){ // return the value of param name when present
			return that.params[name];
		};
		
		this.is = function(type){
			var val = undefined;
			for (var key in headers)
			{
				if (key.toLowerCase() === 'content-type')
				{
					val = headers[key];
					break;
				}
			}
			if (val !== undefined)
			{
				if (type.indexOf('/*') === -1)
				{
					if (type === val)
					{
						return true;
					}
					else if (val.indexOf(';') !== -1)
					{
						if (type === val.substring(0,val.indexOf(';')))
						{
							return true;
						}
						else
						{	
							var begin = val.indexOf('/');
							var end = val.indexOf(';');
							if (end === -1)
							{
								end = val.length;
							}
							var specific = val.substring(begin+1,end);
							if (type === specific)
							{
								return true;
							}
						}
					}
					else if (type === val.substring(val.indexOf('/')+1,val.length))
					{
						return true;
					}
				}
				else
				{
					var typeExp = new RegExp(type);
					if (typeExp.exec(val) !== null)
					{
						return true;
					}
				}
			}
			return false;
		};
		this.prefixResource = "";
		this.rawBody;
	}
	

	function response(httpResponse,path,method)
	{
		var headers = {};
		var isSend = false;
		var isJson = false;
		var cookies = new Array();
		var statusCode = 200;
		var body = "";
		var that = this;
		
		function setHeader(field,value)
		{
			var inserted = false;
			for (var key in headers)
			{
				if (key.toLowerCase() === field.toLowerCase())
				{
					delete headers[key];
					headers[field] = value;
					inserted = true;
					break;
				}
			}
			if (inserted === false)
			{
				headers[field] = value;	
			}
		}
		
		this.set = function(field,value){
			if (value === undefined)
			{
				for (var key in field)
				{
					setHeader(key,field[key]);
				}
			}
			else
			{
				setHeader(field,value);
			}
		};

		this.get = function(field){
			for (var key in headers)
			{
				if (key.toLowerCase() === field.toLowerCase())
				{
					return headers[key];
				}
			}
			return undefined;
		};
		
		this.cookie = function(name,value,options){
			var cookie = new Cookie();
			cookie.key = name;
			if ((typeof value).toLowerCase() === 'object')
			{
				cookie.value = JSON.stringify(value);
			}
			else
			{
				cookie.value = value;
			}
			for (var option in options)
			{
				if (option === 'maxAge')
				{
					cookie.expires = new Date(Date.now() + options[option]);
				}
				else
				{
					cookie[option.toString()] = options[option];
				}
			}
			cookies.push(cookie);
		};
		
		function assignContentTypeLength(status2,contentType,contentLength)
		{
			var hasContentType = false, hasContentLength = false;
			for (var key in headers)
			{
				if (key.toLowerCase() === 'content-type')
				{
					hasContentType = true;
				}
				if (key.toLowerCase() === 'content-length')
				{
					hasContentLength = true;
				}
			}
			if (hasContentType === false)
			{
				headers['Content-Type'] = contentType;
			}
			if (hasContentLength === false)
			{
				headers['Content-Length'] = contentLength;
			}
			if (status2 !== undefined)
			{
				that.status(status2);
			}
		}

		function sendWithOne(p1)
		{
			if ((typeof p1).toLowerCase() === 'string')
			{
				body += p1;
				assignContentTypeLength(200,'text/html',p1.length);
			}
			else if ( ((typeof p1).toLowerCase() === 'array') || ((typeof p1).toLowerCase() === 'object') )
			{
				sendJson(p1);
			}
			else if (((typeof p1).toLowerCase() === 'number'))
			{
				if (p1 === 200)
				{
					body += 'OK';
				}
				else if (p1 === 404)
				{
					body += 'Not Found';
				}
				else if (p1 === 500)
				{
					body += 'Internal Server Error';
				}
				assignContentTypeLength(p1,'text/html',body.length);
			}
		}

		function sendWithTwo(p1,p2)
		{
			if (((typeof p1).toLowerCase() === 'string') && ((typeof p2).toLowerCase() === 'number'))
			{
				body += p1;
				assignContentTypeLength(p2,'text/html',p1.length);
			}
			else if (((typeof p1).toLowerCase() === 'number') && ((typeof p2).toLowerCase() === 'string'))
			{
				body += p2;
				assignContentTypeLength(p1,'text/html',p2.length);
			}
			else if ( ( ( ((typeof p1).toLowerCase() === 'array') || ((typeof p1).toLowerCase() === 'object') ) &&
					    ((typeof p2).toLowerCase() === 'number') ) ||
					  ( ( ((typeof p2).toLowerCase() === 'array') || ((typeof p2).toLowerCase() === 'object') ) &&
					    ((typeof p1).toLowerCase() === 'number') ) )
			{
				sendJson(p1,p2);
			}
		}
		
		this.send = function(p1,p2){
			isSend = true;
			if (p2 === undefined)
			{
				sendWithOne(p1);
			}
			else
			{
				sendWithTwo(p1,p2);
			}
			convertToHttpResponse();
		};
		
		this.json = function(p1,p2){
			sendJson(p1,p2);
		};
		
		this.status = function(code){
			statusCode = code;
			return this;
		};
		
		function sendJson(p1,p2)
		{
			var obj = p1;
			isJson = true;
			if (p2 !== undefined) 
			{
				if ('number' === (typeof p2).toLowerCase()) 
				{
			      that.status(p2);
			    } 
				else 
				{
			      that.status(p1);
			      obj = p2;
			    }
			}
			body += JSON.stringify(obj,' ','  ');
			assignContentTypeLength(undefined,'application/json',body.length);
			convertToHttpResponse();
		}
		
		function convertToHttpHead()
		{
			httpResponse.statusCode = statusCode;
			for (var key in headers)
			{
				httpResponse.setHeader(key,headers[key]);
			}
			for (var i = 0; i < cookies.length; i++)
			{
				httpResponse.setHeader('Set-Cookie',toCookieString(cookies[i]));
			}
		}
		
		function convertToHttpResponse()
		{
			convertToHttpHead();
			httpResponse.write(body);
			httpResponse.end();
		}
		
		function convertToHttpResponseForSendFile()
		{
			convertToHttpHead();
			httpResponse.writeHead(httpResponse.statusCode);
		}
		
		function notFound()
		{
			var body = '<HTML><HEAD>';
			body += '<TITLE>404 Not Found</TITLE>';
			body += '</HEAD><BODY>';
			body += '<H1>Not Found</H1>';
			body += '<P>The requested URL ' + path + ' was not found on this server.</P>';
			body += '</BODY></HTML>';
			httpResponse.writeHead(404,{'Date': (new Date().toUTCString()),
										'Content-Type':'text/html',
										'Content-Length':body.length});
			httpResponse.write(body);
			httpResponse.end();
		}
		
		this.sendfile = function(file)
		{
			convertToHttpResponseForSendFile();
			httpResponse.socket.write(file,function(){
				httpResponse.end();
			});
		};
	}

	function Cookie()
	{
		this.key;
		this.value;
		this.domain = undefined;
		this.path = '/';
		this.expires = undefined;
		this.httpOnly = undefined;	
		this.secure = undefined;
	}
	
	function toCookieString(cookie)
	{
		if (cookie == undefined)
		{
			return;
		}	
		var cookieStr = cookie['key']+'='+cookie['value']+"; ";
		for (var field in cookie)
		{
			if (cookie[field] !== undefined && field !== 'key' && field !== 'value')
			{
				cookieStr+= (field+ "=" + cookie[field] + "; ");
			}
		}
		cookieStr = cookieStr.substr(0,cookieStr.length-2);
		return cookieStr;
	}
		
	function findMatching(method,resource,queue,start)
	{
		var reg,matching;
		for (var i = start; i < queue.length; i++)
		{
			reg = new RegExp(queue[i]['regexp']);
			matching = reg.exec(resource);
			if ( (matching !== null) &&  (matching.index === 0) && 
					( (queue[i]['method'] === method) || (queue[i]['method'] === 'USE') ) )
			{
				matching.splice(0,1);
				delete matching['index'];
				delete matching['input'];
				return [matching,i,queue[i]];
			}
		}
		return undefined;
	}
	
	function getParams(matching,req)
	{
		var j = 0;
		if (matching !== undefined)
		{
			for (var i = 0; i < matching[0].length; i++)
			{
				var param = matching[2]['keys'][j]['name'];
				req.params[param] = matching[0][i];
				j++;
			}
		}
	}
	
	function getQuery(req,parsedUrl)
	{
		var parsed = qs.parse(parsedUrl.query);
		for (var key in parsed)
		{
			req.query[key] = parsed[key];
		}
	}

	function getProtocol(headers)
	{
		if (headers[HTTPS] !== undefined)
		{
			return 'https';
		}
		return 'http';
	}
	
	function getHost(headers)
	{
		var host = headers[HOST];
		if (host !== undefined)
		{
			var end = host.indexOf(':');
			if (end !== -1)
			{
				host = host.substring(0,end);
			}
		}
		return host;
	}
	
	
	function convertToExpressRequest(httpRequest,expressRequest)
	{
		var parsedUrl = url.parse(httpRequest.url);
		expressRequest.path = parsedUrl.pathname;
		expressRequest.protocol = getProtocol(httpRequest.headers);
		expressRequest.host = getHost(httpRequest.headers);
		getQuery(expressRequest,parsedUrl);
		expressRequest.rawBody = httpRequest.body;
		return {'method':httpRequest['method'],'parsedUrl':parsedUrl};
	}
	
	function notFound(httpResponse,httpRequest,path)
	{
		var body = '<HTML><HEAD>';
		body += '<TITLE>404 Not Found</TITLE>';
		body += '</HEAD><BODY>';
		body += '<H1>Not Found</H1>';
		body += '<P>The requested URL ' + path + ' was not found on this server.</P>';
		body += '</BODY></HTML>';
		httpResponse.statusCode = 404;
		httpResponse.setHeader('Date',(new Date().toUTCString()));
		httpResponse.setHeader('Content-Type','text/html');
		httpResponse.setHeader('Content-Length',body.length);
		httpResponse.setHeader('Connection',httpRequest.connection);
		httpResponse.write(body);
		httpResponse.end();
	}
	
	function next(expressRequest,expressResponse,methodAndParsedUrl,start,httpRequest,httpResponse)
	{
		var nextFunc = function()
		{
			var matching = findMatching(methodAndParsedUrl['method'],methodAndParsedUrl['parsedUrl'].pathname,queue,start);
			if (matching !== undefined)
			{
				getParams(matching,expressRequest);
				var myNext = new next(expressRequest,expressResponse,methodAndParsedUrl,(matching[1]+1),httpRequest,httpResponse );
				try
				{
					matching[2]['callback'](expressRequest,expressResponse,myNext);
				}
				catch(e)
				{
					expressResponse.send(500);
				}
			}
			else
			{
				notFound(httpResponse,httpRequest,expressRequest.path);
			}
		
		};
		return nextFunc;
	}
	
	
	var app = function(httpRequest,httpResponse)
	{
		var expressRequest = new request(httpRequest['headers'],httpRequest['method']);
		var expressResponse = new response(httpResponse,httpRequest.url,httpRequest.method);
		var methodAndParsedUrl = convertToExpressRequest(httpRequest,expressRequest);
		var start = 0;
		var matching = findMatching(methodAndParsedUrl['method'],methodAndParsedUrl['parsedUrl'].pathname,queue,start);
		if (matching !== undefined)
		{
			getParams(matching,expressRequest);
			expressRequest.prefixResource = matching[2]['path'];
			var myNext = new next(expressRequest,expressResponse,methodAndParsedUrl,(matching[1]+1),httpRequest,httpResponse);
			try
			{
				matching[2]['callback'](expressRequest,expressResponse,myNext);
			}
			catch(e)
			{
				expressResponse.send(500);
			}
		}
		else
		{
			notFound(httpResponse,httpRequest,expressRequest.path);
		}
	};
	
	app.listen = function(port,callback){
		var server = http.createServer(this);
		return server.listen(port,callback);
	};
	
	function getKeysAndRegex(resource)
	{
		var reg = ""; 	
		var resourceList = (resource.toString()).split("/");
		var numOfParams = 0;
		var paramNames = new Array();
		for (var i in resourceList)
		{
			if(resourceList[i].indexOf(":") === 0)
			{
				numOfParams++;
				reg+=("/([^/]+)");
				paramNames.push({'name':resourceList[i].substr(1,resourceList[i].length),'optional':false});
			}
			else if (resourceList[i]!='')
			{
				reg+="/"+resourceList[i];
			}
		}
		return {'keys':paramNames,'regexp':reg};
	}
	
	var queueOrder = {};
	queueOrder['get'] = new Array();
	queueOrder['post'] = new Array();
	queueOrder['delete'] = new Array();
	queueOrder['put'] = new Array();
	
	function addHandler(queue,resource,requestHandler,method)
	{
		if (requestHandler === undefined)
		{
			requestHandler = resource;
			resource = '/';
		}
		var keysAndRegex = getKeysAndRegex(resource);
		var entry = {'path':resource,'method':method,'callback':requestHandler,'keys':keysAndRegex['keys'],'regexp':keysAndRegex['regexp']};
		queue.push(entry);
		if (method === 'GET')
		{
			queueOrder['get'].push(entry);
		}
		else if (method === 'POST')
		{
			queueOrder['post'].push(entry);
		}
		else if (method === 'DELETE')
		{
			queueOrder['delete'].push(entry);
		}
		else if (method === 'PUT')
		{
			queueOrder['put'].push(entry);
		}
	}
	
	app.use = function(resource,requestHandler){
		addHandler(queue,resource,requestHandler,'USE');
	};

	app.get = function(resource,requestHandler){
		addHandler(queue,resource,requestHandler,'GET');
	};

	app.post = function(resource,requestHandler){
		addHandler(queue,resource,requestHandler,'POST');
	};
	
	app.delete = function(resource,requestHandler){
		addHandler(queue,resource,requestHandler,'DELETE');
	};
	
	app.put = function(resource,requestHandler){
		addHandler(queue,resource,requestHandler,'PUT');
	};
	
	app.route = queueOrder;
	
	module.exports.static = function(rootFolder){
		var p = require('path');
		function createFilePath(partialPath,prefixResource)
		{
			if ( (prefixResource === undefined) && (rootFolder === undefined) )
			{
				return "";
			}
			if (prefixResource === '/')
			{
				var begin = partialPath.indexOf(prefixResource);
				var end = begin + prefixResource.length;
				var temp = partialPath.substr(0,begin);
				temp += (rootFolder + '/');
				temp += partialPath.substr(end,partialPath.length);
				return temp;
			}
			else if (partialPath.indexOf(prefixResource) !== -1)
			{
				var begin = partialPath.indexOf(prefixResource);
				var end = begin + prefixResource.length;
				var temp = partialPath.substr(0,begin);
				temp += rootFolder;
				temp += partialPath.substr(end,partialPath.length);
				return temp;
			}
			return "";
		}
		
		function checkUnderRootFolder(filePath)
		{
			rootFolderRep = rootFolder.replace("/","\\");
			if (filePath.indexOf(rootFolderRep) !== -1)
			{
				return filePath;
			}
			return "";
		}
		
		function getAbsolutePath(partialPath,prefixResource)
		{
			var filePath = createFilePath(partialPath,prefixResource);
			if (filePath !== "")
			{
				filePath = decodeURIComponent(filePath);
				filePath = filePath.replace("/","\\");
				filePath = p.normalize(filePath);
			}
			filePath = checkUnderRootFolder(filePath);
			return filePath;
		}
		
		function getType(filePath)
		{
			var i = filePath.lastIndexOf('.') + 1;
			var type = (i < 0) ? '' : filePath.substr(i);
			if (type === 'js')
			{
				return ('application/javascript');
			}
			if ( (type === 'html') || (type === 'css') || (type === 'ico') ||
				 (type === 'htm') )/////|| (type === 'plain') )
			{
				return ('text/' + type);
			}
			if (type === 'txt')
			{
				return ('text/plain');
			}
			if ( (type === 'jpeg') || (type === 'jpg') || (type === 'gif') )
			{
				return ('image/' + type);
			}
		}
		
		return function(req,res,next)
		{
			if (req.get('Allow') !== 'GET')
			{
				next();
			}
			var filePath = getAbsolutePath(req.path,req.prefixResource);
			fs.readFile(filePath,function(err,file){
				if (err)
				{
					next();
				}
				else
				{
					statusCode = 200;
					res.set('Date',(new Date().toUTCString()));
					res.set('Content-Type',getType(filePath));
					res.set('Content-Length',file.length);
					res.sendfile(file);
				}
			});
		};
	};

	module.exports.cookieParser = function(){
		return function(req,res,next)
		{
			if (req.cookies.length !== undefined)
			{
				return next();
			}
			var cookies = req.get('Cookie');
			if (cookies !== undefined)
			{
				var cookiesList = cookies.split('; ');
				for (var cookie in cookiesList)
				{
					var cookieKeyAndVal = cookiesList[cookie].split('=');
					req.cookies[cookieKeyAndVal[0]] = cookieKeyAndVal[1];
				}
			}
			next();
		};
	};

	function myJson(){
		return function(req,res,next)
		{
			if (req.is('application/json') === false)
			{
				return next();
			}
			req.body = JSON.parse(req.rawBody);
			next();
		};
	};
	
	module.exports.json = myJson;


	 function myurlencoded(){
		return function(req,res,next)
		{
			if (req.is('application/x-www-form-urlencoded') === false)
			{
				return next();
			}
			if (req.rawBody.length > 0)
			{
				var parsed = qs.parse(req.rawBody);
				for (var key in parsed)
				{
					req.body[key] = parsed[key];
				}
			}	
			next();
		};
	};
	
	module.exports.urlencoded = myurlencoded;

	module.exports.bodyParser = function(){
		var _json = module.exports.json;
		var _urlencoded = module.exports.urlencoded;
		return function(req,res,next)
		{
			if (req.is('application/json') === true)
			{
				var a = myJson(req,res,next);
				a(req,res,next);
			}
			else if (req.is('application/x-www-form-urlencoded') === true)
			{
				var b = myurlencoded(req,res,next);
				b(req,res,next);
			}
			else
			{
				next();
			}
		};
	};
	return app;
}

module.exports = miniExpress;