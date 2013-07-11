'use strict';

// Declare app level module which depends on filters, and services

//function MessagingController($scope,sharedModel) {
//    $scope.message = '';
//    $scope.sendMessage = function(msg) {
//        //sharedModel.messages.push({message: msg,date: Date.now(),user:$scope.user});
//        sharedModel.value = msg;
//        $scope.message = '';
//    };
//}
//
//MessagingController.$inject = ['$scope','sharedModel'];

angular.module('myApp', [
  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'ui.bootstrap'
]).
config(function ($routeProvider, $locationProvider) {
    $routeProvider.
      when('/app', {
            templateUrl: 'partials/messageView',
            controller: 'MessagingController'
        }).


    otherwise({
      redirectTo: '/app'
    });

  $locationProvider.html5Mode(true);
})

