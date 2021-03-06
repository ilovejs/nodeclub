var models = require('../models'),
	User = models.User,
	Message = models.Message;

var user_ctrl = require('./user');
var message_ctrl = require('./message');
var EventProxy = require('eventproxy').EventProxy;

function search_at_who(str,cb){
	var pattern = /@[a-zA-Z0-9]+/ig;
	var results = str.match(pattern);
	var names = [];

	if(results){
		for(var i=0; i<results.length; i++){
			var s = results[i];
			//remove char @
			s = s.slice(1);
			names.push(s);
		}
	}
	
	if(names.length == 0){
		return cb(null,names);
	}

	var users = [];
	var proxy = new EventProxy();
	var done = function(){
		return cb(null,users);
	}
	proxy.after('user_found',names.length,done);
	for(var i=0; i<names.length; i++){
		var name = names[i];
		var loginname = name.toLowerCase();	
		user_ctrl.get_user_by_loginname(loginname,function(err,user){
			if(err) return cb(err);
			if(user){
				users.push(user);
				proxy.trigger('user_found');
			}else{
				proxy.trigger('user_found');
			}
		});
	}
}

function send_at_message(str,topic_id,author_id){
	search_at_who(str,function(err,users){
		for(var i=0; i<users.length; i++){
			var user = users[i];
			message_ctrl.send_at_message(user._id,author_id,topic_id);
		}
	});	
}

function link_at_who(str,cb){
	search_at_who(str,function(err,users){
		if(err) return cb(err);
		for(var i=0; i<users.length; i++){
			var name = users[i].name;
			str = str.replace(new RegExp('@'+name,'gmi'),'@<a href="/user/'+name+'">'+name+'</a>');
		}	
		return cb(err,str);
	});
}

exports.send_at_message = send_at_message;
exports.link_at_who = link_at_who;

/******** Jscex ***********/
var Jscex = require("../libs/jscex").Jscex;
var Task = Jscex.Async.Task;
var _ = require("underscore");

var search_at_who_async = eval(Jscex.compile("async", function (str) {
	var pattern = /@[a-zA-Z0-9]+/ig;
	var results = str.match(pattern);
	var names = !results ? [] : _.map(results, function (s) {
        //remove leading "@"
        return s.slice(1);
    });
	
    if (names.length == 0) return names;

    return $await(Task.whenAll(_.map(names, function (n) {
        var loginname = n.toLowerCase();
        return user_ctrl.get_user_by_loginname_async(loginname);
    })));
}));

var link_at_who_async = eval(Jscex.compile("async", function (str) {
    var users = $await(search_at_who_async(str));
    _.each(users, function (u) {
        var name = u.name;
        str = str.replace(
            new RegExp( '@' + name, 'gmi'),
            '@<a href="/user/' + name+ '">' + name + '</a>');
    });
    
    return str;
}));

exports.link_at_who_async = link_at_who_async;