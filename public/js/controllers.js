'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('AppController', function ($scope, $http) {

    $http({
      method: 'GET',
      url: '/api/name'
    }).
    success(function (data, status, headers, config) {
      $scope.name = data.name;
    }).
    error(function (data, status, headers, config) {
      $scope.name = 'Error!'
    });
    $http({
      method: 'GET',
      url: '/api/user'
    }).
    success(function (data, status, headers, config) {
      $scope.user = data.user;
      $scope.admin = ($scope.user.role == 'admin');
    }).
    error(function (data, status, headers, config) {
      $scope.user = 'Error!'
    });
  }).
  controller('MyController1', function ($scope) {
        $scope.message = 'hey';

  }).
  controller('MyController2', function ($scope) {
    // write Ctrl here

  }).
  controller('NavigationController', function ($scope,sharedModel,$rootScope,$http) {
        $scope.notAdmin = true;

        $scope.open = function () {
            $scope.shouldBeOpen = true;
        };

        $scope.close = function () {
            $scope.shouldBeOpen = false;
        };

        $scope.opts = {
            backdropFade: true,
            dialogFade:true
        };

        $scope.name = 'NewChatroom';

        $scope.create = function () {
//            sharedModel.chatRooms.push({ messages: Array(), users: Array(), name: $scope.name})
//            $scope.close();
            $http({
                method: 'POST',
                url: '/api/command/createchatroom',
                data: { name: $scope.name }
            });
            $scope.close();

        };

        $scope.changeChatRoom  = function (room) {
            for (var i = 0; i < sharedModel.chatRooms.length; i++) {
                if (sharedModel.chatRooms[i] == room) {
                    $rootScope.chatRoom = i;
                }
            };
        }
   }).
  controller('MessagingController', function ($scope,sharedModel,$rootScope) {
        if ($rootScope.chatRoom == undefined) {
            $rootScope.chatRoom = 0
        }
        $scope.root = $rootScope;
        $scope.message = '';
        $scope.sendMessage = function(msg) {
            if (msg != '') {
                sharedModel.chatRooms[$rootScope.chatRoom].messages.push({message: msg, date: Date.now(), user: $scope.user.name});
                $scope.message = '';
                setTimeout(function() {
                    var objDiv = angular.element('#messages')[0];
                    objDiv.scrollTop = objDiv.scrollHeight;
                }, (10));
            }
        };
  }).
    controller('AccountController', function ($scope) {
    // write ctrl here
  });
