var path = require('path');
var users = [];
var port = 8001;
var uuid = require("./uuid");
var express = require('./miniExpress');
var app = express();
var jsonSuccess = {
		status: 0,
		msg: ""
};

app.post('/login',express.json());
app.post('/login',function(req,res,next){
	var sent = false;
	for (var i = 0; (i < users.length) && (sent === false); i++)
	{
		if ( (users[i]['username'] === req.body.username) &&
			 (users[i]['password'] === req.body.password) )
		{
			var key = uuid.v1(); 
			var expiresDate = new Date(Date.now() + 1800000);
			res.cookie('session', key, { expires: expiresDate});
			users[i]['session'] = key; 
			users[i]['expires'] = expiresDate;
			res.send(200);
			sent = true;
		}
		if ( (users[i]['username'] === req.body.username) &&
			 (users[i]['password'] !== req.body.password) )
		{
			res.send(500,'Wrong Password');
			sent = true;
		}
	}
	if (sent === false)
	{
		res.send(500,'You should register before try to login - username does not exist');
	}
});

app.post('/register',express.json());
app.post('/register',express.cookieParser());
app.post('/register',function(req,res,next){
	var sent = false;
	for (var i = 0; ((i < users.length) && (sent === false)); i++)
	{
		if (users[i]['username'] === req.body.username)
		{
			res.send(500,'The username is already exists');
			sent = true;
		}
	}
	if (sent === false)
	{
		if ( (req.body.username.length === 0) || (req.body.password.length === 0) )
		{
			res.send(500,'username & password could not be empty');
		}
		else if (req.body.password !== req.body.verifyPassword)
		{
			res.send(500,'password and verify password should be equal');
		}
		else
		{
			users.push({'username':req.body.username, 'password':req.body.password,'fullName':req.body.fullName,
						'session':-1, 'expires':-1, 'list':new Array()});
			res.send(200,'The registration is successful');
		}
	}
});

app.get('/item',express.cookieParser());
app.get('/item',function(req,res,next){
	var sent = false;
	var date = new Date(Date.now());
	for (var i = 0; (i < users.length) && (sent === false); i++)
	{
		if ( (users[i]['session'] === req.cookies.session) &&
		     (date <= users[i]['expires']) )
		{
			var expiresDate = new Date(Date.now() + 1800000);
			users[i]['expires'] = expiresDate; // update cookie time in db.
			res.cookie('session',users[i]['session'],{ expires: expiresDate});
			res.json(200,users[i]['list']);
			sent = true;
		}
	}
	if (sent === false)
	{
		jsonFailed.msg = "You should re-login";
		res.json(400,jsonFailed);
	}
});

app.post('/item',express.json());
app.post('/item',express.cookieParser());
app.post('/item',function(req,res,next){
	var sent = false;
	var date = new Date(Date.now());
	var jsonFailed = {
			status: 1,
			msg: ""
	};
	for (var i = 0; (i < users.length) && (sent === false); i++)
	{
		if ( (users[i]['session'] === req.cookies.session) &&
		     (date <= users[i]['expires']) )
		{
			var expiresDate = new Date(Date.now() + 1800000);
			users[i]['expires'] = expiresDate; // update cookie time in db.
			res.cookie('session',users[i]['session'],{ expires: expiresDate});
			
			for (var j = 0; (j < users[i]['list'].length) && (sent === false); j++)
			{
				if (req.body.id === users[i]['list'][j]['id'])
				{
					jsonFailed.msg = "todo id exists for this user";
					res.json(500,jsonFailed);
					sent = true;
				}
			}
			if (sent === false)
			{
				users[i]['list'].push({'id':req.body.id, 'title':req.body.title,'completed':false});
				res.json(200,jsonSuccess);
				sent = true;
			}
		}
	}
	if (sent === false)
	{
		jsonFailed.msg = "You should re-login";
		res.json(400,jsonFailed);
	}
});

app.put('/item',express.cookieParser());
app.put('/item',express.json());
app.put('/item',function(req,res,next){
	var sent = false;
	var date = new Date(Date.now());
	var jsonFailed = {
			status: 1,
			msg: ""
	};
	for (var i = 0; (i < users.length) && (sent === false); i++)
	{
		if ( (users[i]['session'] === req.cookies.session) &&
		     (date <= users[i]['expires']) )
		{
			var expiresDate = new Date(Date.now() + 1800000);
			users[i]['expires'] = expiresDate; // update cookie time in db.
			res.cookie('session',users[i]['session'],{ expires: expiresDate});
			
			for (var j = 0; (j < users[i]['list'].length) && (sent === false); j++)
			{
				if (req.body.id === users[i]['list'][j]['id'])
				{
					users[i]['list'][j]['title'] = req.body.title;
					users[i]['list'][j]['completed'] = req.body.completed;
					res.json(200,jsonSuccess);
					sent = true;
				}
			}
			if (sent === false)
			{
				jsonFailed.msg = "todo id doesn't exist for this user";
				res.json(500,jsonFailed);
				sent = true;
			}
		}
	}
	if (sent === false)
	{
		jsonFailed.msg = "You should re-login";
		res.json(400,jsonFailed);
	}
});

app.delete('/item',express.cookieParser());
app.delete('/item',express.json());
app.delete('/item',function(req,res,next){
	var sent = false;
	var date = new Date(Date.now());
	var jsonFailed = {
			status: 1,
			msg: ""
	};
	for (var i = 0; (i < users.length) && (sent === false); i++)
	{
		if ( (users[i]['session'] === req.cookies.session) &&
		     (date <= users[i]['expires']) )
		{
			var expiresDate = new Date(Date.now() + 1800000);
			users[i]['expires'] = expiresDate; // update cookie time in db.
			res.cookie('session',users[i]['session'],{ expires: expiresDate});
			if (req.body.id === -1)
			{
				users[i]['list'] = [];
				res.json(200,jsonSuccess);
				sent = true;
			}
			else
			{
				for (var j = 0; (j < users[i]['list'].length) && (sent === false); j++)
				{
					if (req.body.id === users[i]['list'][j]['id'])
					{
						users[i]['list'].splice(j,1);
						res.json(200,jsonSuccess);
						sent = true;
					}
				}
				if (sent === false)
				{
					jsonFailed.msg = "todo id doesn't exist for this user";
					res.json(500,jsonFailed);
					sent = true;
				}
			}
		}
	}
	if (sent === false)
	{
		jsonFailed.msg = "You should re-login";
		res.json(400,jsonFailed);
	}
});

app.use('/',function(req,res,next){
	if (req.path === '/')
	{
		req.path = path.join(req.path,'index.html');
	}
	(express.static(__dirname + '/www'))(req,res,next);
});
app.listen(process.env.PORT || port);