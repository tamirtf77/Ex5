var net = require('net');
var fs = require('fs');
var p = require('path');
var qs = require('querystring');
var events = require("events");
var util = require("util");


function Server(handler)
{
	var instance = undefined;
	var rootResource = undefined, rootFolder = undefined, rootFolderRep = undefined;

	var SPACE = ' ';
	var OK = ' 200 OK';
	var NOT_ALLOWED = ' 405 Method Not Allowed';
	var INTERNAL = ' 500 Internal Server Error';
	var NOT_FOUND = ' 404 Not Found';
	var BAD_REQUEST = ' 400 Bad Request'
	var INVALID_HTTP_VERSION = ' The HTTP version is invalid.';
	var INVALID_METHOD = ' The HTTP method is invalid.';
	var TIMEOUT_ERROR = 'Request Timeout.';

	var HTTP10 = 'HTTP/1.0';
	var HTTP11 = 'HTTP/1.1';
	var HTTP_VERSION_LENGTH = 8;
	var KEEP_ALIVE = 'Connection: keep-alive';
	var CLOSE = 'Connection: close';
	var LAST_REQUEST_TIMEOUT_SEC = 2000;
	var server = this;

	function checkHttpRequest(receiveMsg)
	{
		var request = receiveMsg.substr(0,receiveMsg.indexOf(SPACE));
		if ( (request === 'GET') || (request === 'POST') ||
			 (request === 'PUT') || (request === 'DELETE') )
		{
			return OK;
		}
		if ( (request === 'HEAD')  || (request === 'OPTIONS') ||
		     (request === 'TRACE') || (request === 'CONNECT') )
		{
			return NOT_ALLOWED;
		}
		else	
		{
			return INTERNAL;
		}
	}

	function findVersion(receiveMsg,endLine)
	{
		var firstLine = receiveMsg.substr(0,receiveMsg.indexOf(endLine));
		var version = firstLine.substr(firstLine.length-(HTTP_VERSION_LENGTH),
									    HTTP_VERSION_LENGTH);
		return version;
	}

	function checkHttpVersion(receiveMsg)
	{
		var version = findVersion(receiveMsg,'\r\n');
		if ( (version !== HTTP10) && (version !== HTTP11) )
		{
			version = findVersion(receiveMsg,'\n');
			if ( (version !== HTTP10) && (version !== HTTP11) )
			{
				version = INTERNAL;
			}
		}
		return version;
	}

	function checkSubstring(receiveMsg,what)
	{
		if (receiveMsg.indexOf(what) !== -1)
		{
			return true;
		}
		return false;
	}

	function askingResource(receiveMsg)
	{
		var begin = receiveMsg.indexOf('/');
		var end = receiveMsg.indexOf(' ',begin);
		return receiveMsg.substring(begin,end);
	}
	
	function createHeader(httpVersion,httpRequest,type,keepAlive,length)
	{
		var msg = httpVersion + httpRequest + '\r\n'+
			'Date: ' + (new Date().toUTCString()) + '\r\n' + 
			'Content-Type: ' + type + '\r\n' + 
		'Content-Length: ' + length + '\r\n';
		if (keepAlive == true)
		{
			msg += KEEP_ALIVE + '\r\n';
		}
		msg += '\r\n';
		return msg;
	}

	function createInternalResponse(httpVersion,httpRequest,type,keepAlive,errorMsg)
	{
		var body = '<HTML><HEAD>';
		body += '<TITLE>500 Internal Server Error</TITLE>';
		body += '</HEAD><BODY>';
		body += '<H1>Bad Request</H1>';
		body += '<P>Your browser sent a request that this server could not understand.<br>';
		body += errorMsg;
		body += '</P></BODY></HTML>';
		var msg = createHeader(httpVersion,httpRequest,type,keepAlive,body.length);
		msg+= body;
		return msg;
	}
	
	function getHeaders(data)
	{
		var headers = {};
		var headersPart = data.split("\r\n\r\n");
		if (headersPart.length === 1)
		{
			headersPart = data.split("\n\n");
		}
		var dataList = headersPart[0].split("\r\n");
		if (dataList.length === 1)
		{
			dataList = headersPart[0].split("\n\n");
		}
		for (var i = 1; i < dataList.length; i++)
		{
			var headerAndValue = dataList[i].split(": ");
			if ( (headerAndValue !== undefined) && (headerAndValue[0] != "") )
			{
				headers[headerAndValue[0].toLowerCase()] = headerAndValue[1];
			}
		}
		return headers;
	}
	
	function getBody(receiveMsg,length)
	{
		if (length !== undefined)
		{
			var headAndBody = receiveMsg.split('\r\n\r\n');
			if (headAndBody.legnth === 1)
			{
				headAndBody = receiveMsg.split('\n\n');
			}
			return headAndBody[1].substring(0,length);
		}
		return "";
	}

	function getContentLength(lowerCase)
	{
		var headers = getHeaders(lowerCase);
		return headers['content-length'];
	}
	
	
	function checkConnection(lowerCase)
	{
		if ( (checkSubstring(lowerCase,KEEP_ALIVE.toLowerCase())) === true)
		{
			return 'keep-alive';
		}
		else if ( (checkSubstring(lowerCase,KEEP_ALIVE.toLowerCase())) === true)
		{
			return 'close';
		}
		return "";
	}
	
	function createInternalResponse2(req,res,httpVersion,errorMsg)
	{
		var body = '<HTML><HEAD>';
		body += '<TITLE>500 Internal Server Error</TITLE>';
		body += '</HEAD><BODY>';
		body += '<H1>Bad Request</H1>';
		body += '<P>Your browser sent a request that this server could not understand.<br>';
		body += errorMsg;
		body += '</P></BODY></HTML>';
		res.version = httpVersion;
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/html');
		res.setHeader('Content-Length',body.length);
		if (req.connection !== "")
		{
			res.setHeader('Connection', req.connection);
		}
		res.write(body);
	}

	function createNotAllowedResponse2(req,res,httpVersion,method)
	{
		var body = '<HTML><HEAD>';
		body += '<TITLE>405 Method Not Allowed</TITLE>';
		body += '</HEAD><BODY>';
		body += '<H1>Method Not Allowed</H1>';
		body += '<P>The request method used ' + method + ' is a valid method.<br>';
		body += 'However, the server does not allow that method for the resource requested.</P>';
		body += '</BODY></HTML>';
		res.version = httpVersion;
		res.statusCode = 405;
		res.setHeader('Content-Type', 'text/html');
		res.setHeader('Content-Length',body.length);
		if (req.connection !== "")
		{
			res.setHeader('Connection', req.connection);
		}
		res.write(body);
	}
	
	
	

	function HttpRequest(receiveMsg)
	{
		var lowerCase = receiveMsg.toLowerCase();
		this.httpVersion = checkHttpVersion(receiveMsg);
		this.headers = getHeaders(receiveMsg);
		this.method = receiveMsg.substr(0,receiveMsg.indexOf(SPACE));
		this.url = askingResource(receiveMsg);
		this.statusCode = checkHttpRequest(receiveMsg);
		this.connection = checkConnection(lowerCase);
		this.body = getBody(receiveMsg,this.headers['content-length']);
	}
	
	function getStatusString(statusCode)
	{
		if (statusCode === 200)
		{
			return OK;
		}
		else if (statusCode === 404)
		{
			return NOT_FOUND;
		}
		else if (statusCode === 405)
		{
			return NOT_ALLOWED;
		}
		else if (statusCode === 500)
		{
			return INTERNAL;
		}
		else if (statusCode === 400)
		{
			return BAD_REQUEST;
		}
	}
	
	
	function createHeader2(httpVersion,statusCode,headers,cookies)
	{
		var httpStatus = getStatusString(statusCode);
		var msg = httpVersion + httpStatus + '\r\n';
		for (var key in headers)
		{
			msg += (key + ': ' + headers[key] + '\r\n');
		}
		for (var i = 0; i < cookies.length; i++)
		{
			msg += ('Set-Cookie: ' + cookies[i] + '\r\n');
		}
		msg += '\r\n';
		return msg;
	}
	
	function HttpResponse(socket,req)
	{
		var headers = {};
		var cookies = [];
		var body = "";
		var writeHeadCalled = false;

		this.socket = socket;
		var that = this;
		this.writeHead = function(statusCode,headersToFill)
		{
			writeHeadCalled = true;
			that.statusCode = statusCode;
			addDate();
			if (headersToFill !== undefined)
			{
				for (var key in headersToFill)
				{
					headers[key] = headersToFill[key];
				}
			}
			addConnection();
			socket.write(createHeader2(req.httpVersion,statusCode,headers,cookies));
		};
		
		this.statusCode = 200;
		
		function setCookie(value)
		{
			var insert = false;
			for (var i = 0; i < cookies.length; i++)
			{
				if (cookies[i].toLowerCase() === value.toLowerCase())
				{
					cookies[i] = value;
					insert = true;
					break;
				}
			}
			if (insert === false)
			{
				cookies.push(value);
			}	
		}
		
		this.setHeader = function(name,value){
			if (name.toLowerCase() === 'set-cookie')
			{
				setCookie(value);
			}
			else
			{
				var insert = false;
				for (var key in headers)
				{
					if (key.toLowerCase() === name.toLowerCase())
					{
						delete headers[key];
						headers[name] = value;
						insert = true;
						break;
					}
				}
				if (insert === false)
				{
					headers[name] = value;
				}	
			}
		};
		
		this.headersSent = false;
		
		this.sendDate = true;
		
		this.getHeader = function(name){
			for (var key in headers)
			{
				if (key.toLowerCase() === name.toLowerCase())
				{
					return headers[key];
				}
			}
		};
		
		this.removeHeader = function(name){
			for (var key in headers)
			{
				if (key.toLowerCase() === name.toLowerCase())
				{
					delete headers[key];
					break;
				}
			}
		};
		
		var that = this;
		
		function addDate()
		{
			if (that.sendDate === true)
			{
				var hasDate = false;
				for (var key in that.headers)
				{
					if (key.toLowerCase() === 'date')
					{
						hasDate = true;
					}
				}
				if (hasDate === false)
				{
					headers['Date'] = (new Date().toUTCString());
				}
			}
		}
		
		function addConnection()
		{
			var hasConnection = false;
			for (var key in that.headers)
			{
				if (key.toLowerCase() === 'connection')
				{
					hasConnection = true;
				}
			}
			if (hasConnection === false)
			{
				headers['Connection'] = req.connection;
			}
		}
		
		this.write = function(chunk){
			if (writeHeadCalled === false)
			{
				this.writeHead(this.statusCode);
				writeHeadCalled = true;
			}
			socket.write(chunk);
		};
		
		this.end = function(chunk){
			if (chunk !== undefined)
			{
				this.write(chunk);
			}
			closeSocketIfNeed(req.httpVersion,req.connection,socket);
		};
	}
	
	function closeSocketIfNeed(httpVersion,connection,socket)
	{
		if ( ((httpVersion === HTTP10) && (connection === "")) ||
			     (connection === 'close') )
			{
				socket.end();
			}
	}
	
	events.EventEmitter.call(this);
	
	this.listen = function (port,callback) {
		var k = 0;
		instance = net.createServer(function(socket) {
			var buffer = "", receiveMsg = "",lowerCase = "";
			var response = "";
			
			socket.setTimeout(LAST_REQUEST_TIMEOUT_SEC,function(){
				if (buffer !== "")
				{
					socket.write(createInternalResponse(HTTP11,INTERNAL,'text/html',CLOSE,TIMEOUT_ERROR));
				}
				socket.end();
			});
			
			socket.on('error',function(){
			});
			
			socket.on('data', function(data) {
				receiveMsg = data.toString('utf8');
				buffer += receiveMsg;
				while ( (buffer.indexOf('\r\n\r\n') !== -1) || (buffer.indexOf('\n\n') !== -1) )
				{
					var endPattern = '\r\n\r\n';
					var end = buffer.indexOf('\r\n\r\n');
					if (end === -1)
					{
						end = buffer.indexOf('\n\n');//Even though header lines should end with CRLF, someone might use a single LF instead. Accept either CRLF or LF.
						endPattern = '\n\n';
					}
					receiveMsg = buffer.substring(0,end);
					lowerCase = receiveMsg.toLowerCase();
					buffer = buffer.substring(end + endPattern.length,buffer.length);
					
					var bodyLength = getContentLength(lowerCase);
					if (bodyLength > 0)
					{
						receiveMsg += ('\r\n\r\n' + buffer.substring(0,bodyLength));
						buffer = buffer.substring(bodyLength,buffer.length);
					}
					var req = new HttpRequest(receiveMsg);
					var res = new HttpResponse(socket,req);
					if (req.httpVersion === INTERNAL)
					{
						createInternalResponse2(req,res,HTTP11,INVALID_HTTP_VERSION);
					}
					else if (req.statusCode === INTERNAL)
					{
						createInternalResponse2(req,res,req.httpVersion,INVALID_METHOD);
					}
					else if (req.statusCode === NOT_ALLOWED)
					{
						createNotAllowedResponse2(req,res,req.method);
					}
					else
					{
						handler(req,res);
					}
				}
				});
			
			});
		instance.listen(port,(function(){
			if (typeof callback === 'function')
			{
				callback();
			}
		}));

		instance.on('error', function (e) {
			console.log('error');
			if (e.code == 'EADDRINUSE') {
				console.log('Port ' + port + ' in use');
			}
		});
	};
	
	this.on('close',onClose);
	
	function onClose(callback2)
	{
		if (typeof callback2 === 'function')
		{
			callback2();
		}
	}
	
	this.close = function(callback2)
	{
		if (instance._handle !== null)
		{
			instance.close();
			server.emit('close',onClose(callback2));
		}
	};
	
}

exports.createServer = function (handler){
	util.inherits(Server, events.EventEmitter);
	var server1 = new Server(handler);
	return server1;
};