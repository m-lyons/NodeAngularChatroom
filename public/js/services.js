'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', []).
    factory('sharedModel', function($rootScope) {
        var model = { chatRooms: [] };
        var lastModel = angular.copy(model);

        var socket = io.connect('http://localhost:3001/');

        socket.on('channel', function(message){
            set(model, message.path, message.value);
            set(lastModel, message.path, message.value);
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

        function syncObject(parent, src, dst) {
            for(var name in src) {
                var path = (parent ? parent + '.' : '') + name;
                if (src[name] === dst[name]) {
                    // do nothing we are in sync
                } else if (typeof src[name] == 'object') {
                    // we are an object, so we need to recurse
                    syncObject(path, src[name], dst[name] || {});
                } else {
                    socket.emit("channel", {path:path, value:src[name]});
                    dst[name] = angular.copy(src[name]);
                }
            }
        }

        $rootScope.$watch('sharedModel', function() {
            syncObject('', model, lastModel);
        }, true);

        return model;



        function set(obj, path, value) {
            if (!path) return angular.copy(value, obj);
            var lastObj = obj;
            var property;
            angular.forEach(path.split('.'), function(name){
                if (name) {
                    lastObj = obj;
                    obj = obj[property=name];
                    if (!obj) {
                        lastObj[property] = obj = {};
                    }
                }
            });
            lastObj[property] = angular.copy(value);
        }
    }).
  value('version', '0.1');
