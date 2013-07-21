'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', []).
    factory('sharedModel', function($rootScope) {
        var model = { chatRooms: [] };
        var lastModel = angular.copy(model);

        var socket = io.connect('http://localhost:3001/');

        socket.on('initialize', function(msg) {
            model.chatRooms = msg.chatRooms;
            lastModel = angular.copy(model);
            $rootScope.sharedModel = model;
            $rootScope.$apply();
        });

        socket.on('message', function(msg) {
            model.chatRooms[msg.chatroom].messages.push(msg.message);
            lastModel.chatRooms[msg.chatroom].messages.push(msg.message);
            $rootScope.sharedModel = model;
            var objDiv = angular.element('#messages')[0];
            var scrolledHeight = (objDiv.scrollTop + Math.floor($("#right").height() + 100));
            console.log(scrolledHeight);
            console.log(objDiv.scrollHeight);
            if (scrolledHeight > objDiv.scrollHeight) {
                $rootScope.following = true;
            } else {
                $rootScope.following = false;
            }
            $rootScope.$apply();
            setTimeout(function() {
                if ($rootScope.following) {
                    var objDiv = angular.element('#messages')[0];
                    objDiv.scrollTop = objDiv.scrollHeight;
                }
            }, (10));
        });

        socket.on('chatroom', function(msg) {
            model.chatRooms.push({ messages : [], users : [], name : msg.name});
            lastModel.chatRooms.push({ messages : [], users : [], name : msg.name});
            $rootScope.sharedModel = model;
            $rootScope.$apply();
        });

        $rootScope.$watch('sharedModel', function() {
          for(var chatroom in model.chatRooms) {
            for(var msg in model.chatRooms[chatroom].messages) {
              if (lastModel.chatRooms[chatroom].messages[msg] != undefined && lastModel.chatRooms[chatroom].messages[msg] != null && model.chatRooms[chatroom].messages[msg].message === lastModel.chatRooms[chatroom].messages[msg].message) {
                // do nothing we are in sync
               
              } else {
                socket.emit("message", { chatroom : chatroom, message : model.chatRooms[chatroom].messages[msg]});
                lastModel.chatRooms[chatroom].messages[msg] = angular.copy(model.chatRooms[chatroom].messages[msg]);
              }
            }
          }
        }, true);

        return model;

    }).
  value('version', '0.1');
