var PORT = 8001;
var http = require('http');
var mainServer = require('./main');
var cookie;

function testRegister(startMsg,fullName,username,password,verifyPassword,port,method,path,resMsg,successMsg,failedMsg,errorInReq)
{
	console.log(startMsg);
	var json = {
			fullName: fullName,
			username: username,
			password: password,
			verifyPassword: verifyPassword
	};
	var body = JSON.stringify(json);

	var options = {
	  port: port,
	  method: method,
	  path: path,
	  headers: {'Content-Type': 'application/json', 'Content-Length':body.length}
	};
	var req = http.request(options, function(res){
	  res.on('data', function(chunk){
		  if (chunk.toString() === resMsg)
		  {
			  console.log(successMsg);
		  }
		  else
		  {
			  console.log(failedMsg);
		  }
	  });
	  
	}).on('error', function(e){
		console.log(errorInReq + e.message);
	});
	req.write(body);
}

function testLogin(startMsg,username,password,port,method,path,resMsg,successMsg,failedMsg,errorInReq)
{
	console.log(startMsg);
	var json = {
			username: username,
			password : password
	};
	var body = JSON.stringify(json);
	var options = {
	  port: port,
	  method: method,
	  path: path,
	  headers: {'Content-Type': 'application/json', 'Content-Length':body.length}
	};

	var req = http.request(options, function(res){
		if (res.headers['set-cookie'] !== undefined)
		{
			cookie = res.headers['set-cookie'][0].split('; ');
		}
		res.on('data', function(chunk){
			if (chunk.toString() === resMsg)
			{
				console.log(successMsg);
			}
			else
			{
				console.log(failedMsg);
			}
		});
	  
	}).on('error', function(e){
		console.log(errorInReq + e.message);
	});
	req.write(body);
}

function testItem(startMsg,port,method,path,jsonStatus,jsonMsg,successMsg,failedMsg,errorInReq,myCookie,id,title,completed)
{
	console.log(startMsg);
	var json = {
			id: id,
			title: title,
			completed: completed
	};
	var body = JSON.stringify(json);
	var options = {
	  port: port,
	  method: method,
	  path: '/item',
	  headers: {'Content-Type': 'application/json', 'Content-Length':body.length,'Cookie':myCookie}
	};

	var req = http.request(options, function(res){
		if (res.headers['set-cookie'] !== undefined)
		{
			cookie = res.headers['set-cookie'][0].split('; ');
		}
		res.on('data', function(chunk){
			var resJson = JSON.parse(chunk.toString());
			if ( (resJson.status === jsonStatus) && (resJson.msg === jsonMsg) )
			{
				console.log(successMsg);
			}
			else
			{
				console.log(failedMsg);
			}
		});
	  
	}).on('error', function(e){
		console.log(errorInReq + e.message);
	});
	req.write(body);
}

function testItemGet(startMsg,port,method,path,successMsg,failedMsg,errorInReq,myCookie,
					jsonId,jsonTitle,jsonCompleted)
{
	console.log(startMsg);
	var options = {
	  port: port,
	  method: method,
	  path: '/item',
	  headers: {'Cookie':myCookie}
	};

	var req = http.request(options, function(res){
		if (res.headers['set-cookie'] !== undefined)
		{
			cookie = res.headers['set-cookie'][0].split('; ');
		}
		res.on('data', function(chunk){
			var resJson = JSON.parse(chunk.toString());
			if ( (resJson.status != undefined) && (resJson.msg != undefined) && 
				 (resJson.status === jsonId) && (resJson.msg === jsonTitle) )
			{
				console.log(successMsg);
			}
			else if ( (resJson[0].id === jsonId) && (resJson[0].title === jsonTitle) && 
					  (resJson[0].completed !== undefined) && (resJson[0].completed === jsonCompleted) )
			{
				console.log(successMsg);
			}
			else
			{
				console.log(failedMsg);
			}
		});
	  
	}).on('error', function(e){
		console.log(errorInReq + e.message);
	});
	req.end();
}



console.log('/register and /login Tests:');
console.log();
testRegister('1.start try_register_username_empty','Israel Israeli','','12345','12345',PORT,'POST','/register','username & password could not be empty',
		'1.test try_register_username_empty SUCCEEDED','1.test try_register_username_empty failed',
		'in test 1 got error: ');

testRegister('2.start try_register_password_empty','Israel Israeli','Shimon','','12345',PORT,'POST','/register','username & password could not be empty',
		'2.test try_register_password_empty SUCCEEDED','2.test try_register_password_empty failed',
		'in test 2 got error: ');

testRegister('3.start try_register_password_and_verifyPassword_not_equal','Israel Israeli','Yehuda','1234','12345',PORT,'POST','/register','password and verify password should be equal',
		'3.test try_register_password_and_verifyPassword_not_equal SUCCEEDED','3.test try_register_password_and_verifyPassword_not_equal failed',
		'in test 3 got error: ');

testRegister('4.start try_registration_successful','Israel Israeli','Israel','12345','12345',PORT,'POST','/register','The registration is successful',
		'4.test try_registration_successful SUCCEEDED','4.test try_registration_successful failed',
		'in test 4 got error: ');
console.log();

setTimeout(function(){
	console.log();
	testRegister('5.start try_registration_username_is_already_exists','Israel Israeli','Israel','12345','12345',PORT,'POST','/register','The username is already exists',
			'5.test try_registration_username_is_already_exists SUCCEEDED','5.test try_registration_username_is_already_exists failed',
			'in test 5 got error: ');
	testLogin('6.start try_login_before_register','Israel2','12345',PORT,'POST','/login','You should register before try to login - username does not exist',
			'6.test try_login_before_register SUCCEEDED','6.test try_login_before_register failed',
			'in test 6 got error: ');
	testLogin('7.start try_login_wrong_password','Israel','1234',PORT,'POST','/login','Wrong Password',
			'7.test try_login_wrong_password SUCCEEDED','7.test try_login_wrong_password failed',
			'in test 7 got error: ');
	testLogin('8.start try_successful_login','Israel','12345',PORT,'POST','/login','OK',
			'8.test try_successful_login SUCCEEDED','8.test try_successful_login failed',
			'in test 8 got error: ');
	console.log();
	setTimeout(function(){
		console.log();
		console.log('/item Tests:');
		testItem('9a.start try_post_todo',PORT,'POST','/item',0,'',
				'9a.test try_post_todo SUCCEEDED','9a.test try_post_todo failed',
				'in test 9a got error: ',cookie[0],0,'a new active',false);
		testItem('9b.start try_post_todo',PORT,'POST','/item',0,'',
				'9b.test try_post_todo SUCCEEDED','9b.test try_post_todo failed',
				'in test 9b got error: ',cookie[0],4,'a new active2',false);
		setTimeout(function(){
				console.log();
				testItem('10.start try_post_todo_id_exists',PORT,'POST','/item',1,'todo id exists for this user',
						'10.test try_post_todo_id_exists SUCCEEDED','10.test try_post_todo_id_exists failed',
						'in test 10 got error: ',cookie[0],0,'a new active',false);
				testItem('11.start try_post_todo_wrong_cookie',PORT,'POST','/item',1,'You should re-login',
						'11.test try_post_todo_wrong_cookie SUCCEEDED','11.test try_post_todo_wrong_cookie failed',
						'in test 11 got error: ',(cookie[0]+'g1'),0,'a new active',false);
				setTimeout(function(){
					console.log();
					testItem('12.start try_put_todo',PORT,'PUT','/item',0,'',
							'12.test try_put_todo SUCCEEDED','12.test try_put_todo failed',
							'in test 12 got error: ',cookie[0],0,'change an exist active',false);
						setTimeout(function(){
							console.log();
							testItem('13.start try_put_todo_id_does_not_exist',PORT,'PUT','/item',1,"todo id doesn't exist for this user",
									'13.test try_put_todo_id_does_not_exist SUCCEEDED','13.test try_put_todo_id_does_not_exist failed',
									'in test 13 got error: ',cookie[0],1,'a new active',false);
							testItem('14.start try_put_todo_wrong_cookie',PORT,'PUT','/item',1,'You should re-login',
									'14.test try_put_todo_wrong_cookie SUCCEEDED','11.test try_put_todo_wrong_cookie failed',
									'in test 14 got error: ',(cookie[0]+'g1'),0,'a new active',false);
							testItemGet('15.start try_get_todo',PORT,'GET','/item',
									'15.test try_get_todo SUCCEEDED','15.test try_get_todo failed',
									'in test 15 got error: ',cookie[0],0,'change an exist active',false);
							testItemGet('16.start try_get_todo_wrong_cookie',PORT,'GET','/item',
									'16.test try_get_todo_wrong_cookie SUCCEEDED','16.test try_get_todo_wrong_cookie failed',
									'in test 16 got error: ',(cookie[0]+'g1'),1,'You should re-login');
							setTimeout(function(){
								console.log();
								testItem('17.start try_delete_todo_id_does_not_exist',PORT,'DELETE','/item',1,"todo id doesn't exist for this user",
										'17.test try_delete_todo_id_does_not_exist SUCCEEDED','17.test try_delete_todo_id_does_not_exist failed',
										'in test 17 got error: ',cookie[0],1,'a new active',false);
								testItem('18.start try_delete_todo_wrong_cookie',PORT,'DELETE','/item',1,'You should re-login',
										'18.test try_delete_todo_wrong_cookie SUCCEEDED','18.test try_delete_todo_wrong_cookie failed',
										'in test 18 got error: ',(cookie[0]+'g1'),0,'a new active',false);
								setTimeout(function(){
									testItem('19.start try_delete_todo',PORT,'DELETE','/item',0,'',
											'19.test try_delete_todo SUCCEEDED','19.test try_delete_todo failed',
											'in test 19 got error: ',cookie[0],0,'a new active',false);
									setTimeout(function(){
										testItem('20.start try_delete_all_todo',PORT,'DELETE','/item',0,'',
												'20.test try_delete_all_todo SUCCEEDED','20.test try_delete_all_todo failed',
												'in test 20 got error: ',cookie[0],-1,'',false);
									},500)
								},400);

							},400);
						},400);
				},400);
		},400);
	},1000);	
},1000);