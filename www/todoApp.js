var phonecatApp = angular.module('phonecatApp', ['ngRoute']);
 
phonecatApp.controller('loginRegisterCtrl', function ($scope, $http, $location) {
  $scope.beforeLogin = false;
  $scope.registerFullname = "";
  $scope.registerUsername = "";
  $scope.registerPassword = "";
  $scope.registerVerifyPassword = "";

  $scope.makeLogin = function(){
	var json = {
			username: $scope.loginUsername,
			password : $scope.loginPassword
	};
	var body = JSON.stringify(json);
	$http({
			url: '/login',
       		method: "POST",
       		data: body,
       		headers: {'Content-Type': 'application/json'}
	}).success(function(response) 
	{
		$scope.beforeLogin = true;
		$location.path('/yourList');
    }).error(function(response)
    {
    	if (response === "")
    	{
        	alert('Can not connect to server');	
    	}
    	else
    	{
    		alert(response);
    	}
    })
  };
  
  
  $scope.makeRegister = function(){
		var json = {
				fullName: $scope.registerFullname,
				username: $scope.registerUsername,
				password : $scope.registerPassword,
				verifyPassword: $scope.registerVerifyPassword
		};
		var body = JSON.stringify(json);
		$http({
				url: '/register',
	       		method: "POST",
	       		data: body,
	       		headers: {'Content-Type': 'application/json'}
		}).success(function(response) 
		{
	        	alert(response);
	    }).error(function(response)
	    {
	    	if (response === "")
	    	{
	    		alert('Can not connect to server');
	    	}
	    	else if (response === 'Internal Server Error')
			{
				alert('username & password could not be empty');
			}
			else
			{
		    	alert(response);
			}
	    })
	  };
});

phonecatApp.controller('ListDetailCtrl',function($scope, $routeParams, $http, $location, filterFilter){
	var idSeqNum = -1;
	var idsExist = [];
	$scope.todos = [];
	$scope.completedCount = 0;
	$scope.remainingCount = 0;
	$scope.editedTodo = undefined;

	$scope.postItem = function(){
		idSeqNum++;
		var json = {
				id: idSeqNum,
				title: $scope.newTodo
		};
		var body = JSON.stringify(json);
		$http({
				url: '/item',
	       		method: "POST",
	       		data: body,
	       		headers: {'Content-Type': 'application/json'}
		}).success(function(response,status) 
		{
			var data = {id:idSeqNum, title:$scope.newTodo, completed:false, editing:undefined};
			$scope.todos.push(data);
			$scope.remainingCount++;
			$scope.newTodo = "";
	    }).error(function(response,status)
	    {
	    	if (response === "")
	    	{
	        	alert('Can not connect to server');
	    		$scope.newTodo = "";
	    	}
	    	else if (status === 400)
        	{
        		alert(response.msg);
        		$location.path('/');
        	}
	    	else if (status === 500)
        	{
        		alert(response.msg);
        	}
	    })
	  };
	  
	  $scope.editTodo = function(todo) {
		  $scope.editedTodo = todo;
		  todo.editing = {id:todo.id, title:todo.title, completed:todo.completed, editing:undefined}; //save the previous in case the server will send an error
	  };
	  
	  $scope.revertEditing = function(todo){
		  todo.title = todo.editing.title;
		  $scope.doneEditing(todo);
	  };
	  
	  $scope.doneEditing = function(todo){
		  $scope.editedTodo = undefined;
		  var json = {
			id: todo.id,
			title: todo.title,
			completed: todo.completed
		  };
		  var body = JSON.stringify(json);
		  $http({
			  url: '/item',
			  method: "PUT",
			  data: body,
			  headers: {'Content-Type': 'application/json'}
		  }).success(function(response,status) 
		  {

		  }).error(function(response,status)
		  {
		    	if (response === "")
		    	{
		        	alert('Can not connect to server');
	  			    angular.forEach($scope.todos, function(item) {
						if (item.id === todo.id)
						{
							item.title = todo.editing.title;
							item.completed = todo.editing.completed;
						}
					});
		    	}
		    	else if (status === 400)
	        	{
	        		alert(response.msg);
	        		$location.path('/');
	        	}
		    	else if (status === 500)
	        	{
	        		alert(response.msg);
	  			    angular.forEach($scope.todos, function(item) {
						if (item.id === todo.id)
						{
							item.title = todo.editing.title;
							item.completed = todo.editing.completed;
						}
					});
	        	}
		  })
	  };
	  
	  $scope.deleteItem = function(todo) {
			var json = {
					id: todo.id
			};
			var body = JSON.stringify(json);
			$http({
					url: '/item',
		       		method: "DELETE",
		       		data: body,
		       		headers: {'Content-Type': 'application/json'}
			}).success(function(response,status) 
			{
				var oldTodos = $scope.todos;
				$scope.todos = [];
				angular.forEach(oldTodos, function(item) {
					if (item.id !== todo.id) 
						$scope.todos.push(item);
				});
				if (todo.completed === false)
				{
					$scope.remainingCount--;
				}	
				else if (todo.completed === true)
				{
					  $scope.completedCount--;
				}
		    }).error(function(response,status)
		    {
		    	if (response === "")
		    	{
		        	alert('Can not connect to server');	
		    	}
		    	else if (status === 400)
	        	{
	        		alert(response.msg);
	        		$location.path('/');
	        	}
		    	else if (status === 500)
	        	{
	        		alert(response.msg);
	        	}
		    })
	  	};
		  
		  
		  $scope.markAll = function(allChecked) {
			  $scope.completedCount = 0;
			  $scope.remainingCount = 0;
			  if ( (allChecked === false) || (allChecked === undefined) )
			  {
				  angular.forEach($scope.todos, function(item) 
				  {
					  $scope.completedItem(item,false);
				  });
			  }
			  else
			  {
				  angular.forEach($scope.todos, function(item) 
				  {
					  $scope.completedItem(item,true);
				  });

			  }
			  $scope.allChecked = !$scope.remainingCount;
		  };
		  
		  $scope.completedItem = function(todo,completedStatus) {
			  todo.completed = !completedStatus;
			  var json = {
						id: todo.id,
						title: todo.title,
						completed: todo.completed
					   };
			  var body = JSON.stringify(json);
			  $http({
					url: '/item',
					method: "PUT",
					data: body,
					headers: {'Content-Type': 'application/json'}
			  }).success(function(response,status) {
				  if (todo.completed === true)
				  {
					  $scope.completedCount++;
					  if ($scope.remainingCount > 0)
					  {
						  $scope.remainingCount--;
					  }
				  }
				  else if (todo.completed === false)
				  {
					  $scope.remainingCount++;
					  if ($scope.completedCount > 0)
					  {
						  $scope.completedCount--;
					  }
				  }
				  $scope.allChecked = !$scope.remainingCount;
			  }).error(function(response,status){
			    	if (response === "")
			    	{
			        	alert('Can not connect to server');
			    	}
			    	else if (status === 400)
		        	{
		        		alert(response.msg);
		        		$location.path('/');
		        	}
			    	else if (status === 500)
		        	{
		        		alert(response.msg);
						angular.forEach($scope.todos, function(item) {
							if (item.id === todo.id)
							{
								item.completed = completedStatus;
							}
						});
						$scope.allChecked = !$scope.remainingCount;
		        	}
			})
		  };
		  
		  $scope.clearCompletedTodos = function(){
			  angular.forEach($scope.todos, function(item){
				  		if (item.completed === true)
				  		{
					  		$scope.deleteItem(item);
				  		}
				  		$scope.allChecked = false;
			  });
		  }
		  
		  // Monitor the current route for changes and adjust the filter accordingly.
		  $scope.$on('$routeChangeSuccess', function () {
			  var status = $scope.status = $routeParams.status || '';
			  $scope.statusFilter = (status === 'active') ?
				 { completed: false } : (status === 'completed') ?
				 { completed: true } : null;
		   });
		  
		  
		$http({
			url: '/item',
	   		method: "GET"
		}).success(function(response,status) 
		{
			$scope.todos = response;
			$scope.remainingCount = 0;
			angular.forEach($scope.todos, function(item){
				idsExist.push(item.id);
				if (item.completed === false)
			  	{
					$scope.remainingCount++;
			  	}
			});
			$scope.completedCount = $scope.todos.length - $scope.remainingCount;
			if ($scope.todos.length === 0)
			{
				$scope.allChecked = false;
			}
			else
			{
				$scope.allChecked = !$scope.remainingCount;
			}
			if (idsExist.length > 0)
			{
				idSeqNum = Math.max.apply(Math,idsExist);
			}
		}).error(function(response,status)
		{
	    	if (response === "")
	    	{
	        	alert('Can not connect to server');	
	    	}
		})
});

phonecatApp.directive('todoEscape', function () {
	var ESCAPE_KEY = 27;
	return function (scope, element, attributes) {
		element.bind('keydown', function (event)
		{
			if (event.keyCode === ESCAPE_KEY) 
            {
				scope.$apply(attributes.todoEscape);
			}
		});
	};
});

phonecatApp.directive('todoFocus', function todoFocus($timeout) {
	return function (scope, element, attributes) {
		scope.$watch(attributes.todoFocus, function (newVal) {
			if (newVal)
            {
				$timeout(function () {
					element[0].focus();
				}, 0, false);
			}
		});
	};
});


phonecatApp.config(function($routeProvider) {
    $routeProvider.
      when('/', {
          templateUrl: 'login-register.html',
          controller: 'loginRegisterCtrl'
      }).
      when('/yourList', {
          templateUrl: 'list-detail.html',
          controller: 'ListDetailCtrl'
      }).
      when('/yourList/:status', {
    	  templateUrl: 'list-detail.html',
          controller: 'ListDetailCtrl'
      }).
      otherwise({
          redirectTo: '/login-register.html'
      });
  });