var tag_ctrl = require('./tag');
var user_ctrl = require('./user');
var topic_ctrl = require('./topic');

var config = require('../config').config;
var EventProxy = require('eventproxy').EventProxy;

exports.index = function(req,res,next){
	var page = Number(req.query.page) || 1;
	var limit = config.list_topic_count;

	var render = function(tags,topics,hot_topics,stars,tops,no_reply_topics,pages){
		 var all_tags = tags.slice(0);

		// 计算最热标签
		tags.sort(function(tag_a,tag_b){
					if(tag_a.topic_count == tag_b.topic_count) return 0;
					if(tag_a.topic_count > tag_b.topic_count) return -1;
					if(tag_a.topic_count < tag_b.topic_count) return 1;
				});
		var hot_tags = tags.slice(0,5); 

		// 计算最新标签
		tags.sort(function(tag_a,tag_b){
					if(tag_a.create_at == tag_b.create_at) return 0;
					if(tag_a.create_at > tag_b.create_at) return -1;
					if(tag_a.create_at < tag_b.create_at) return 1;
				});
		var recent_tags = tags.slice(0,5);

		res.render('index',{tags:all_tags,topics:topics,current_page:page,list_topic_count:limit,hot_tags:hot_tags,recent_tags:recent_tags,
						hot_topics:hot_topics,stars:stars,tops:tops,no_reply_topics:no_reply_topics,pages:pages});
	};	
	
	var proxy = new EventProxy();
	proxy.assign('tags','topics','hot_topics','stars','tops','no_reply_topics','pages',render);
	
	tag_ctrl.get_all_tags(function(err,tags){
		if(err) return next(err);
		proxy.trigger('tags',tags);
	});

	var opt = {skip:(page-1)*limit, limit:limit, sort:[['last_reply_at','desc']]};
	topic_ctrl.get_topics_by_query({},opt,function(err,topics){
		if(err) return next(err);
		proxy.trigger('topics',topics);
	});
	opt = {limit:5, sort:[['visit_count','desc']]};
	topic_ctrl.get_topics_by_query({},opt,function(err,hot_topics){
		if(err) return next(err);
		proxy.trigger('hot_topics',hot_topics);
	});
	opt = {limit:5};
	user_ctrl.get_users_by_query({is_star:true},opt,function(err,users){
		if(err) return next(err);
		proxy.trigger('stars',users);
	});	
	opt = {limit:10, sort:[['score','desc']]};
	user_ctrl.get_users_by_query({},opt,function(err,tops){
		if(err) return next(err);
		proxy.trigger('tops',tops);
	});
	opt = {limit:5, sort:[['create_at','desc']]};
	topic_ctrl.get_topics_by_query({reply_count:0},opt,function(err,no_reply_topics){
		if(err) return next(err);
		proxy.trigger('no_reply_topics',no_reply_topics);
	});
	topic_ctrl.get_count_by_query({},function(err,all_topics_count){
		if(err) return next(err);
		var pages = Math.ceil(all_topics_count/limit);
		proxy.trigger('pages',pages);
	});
};

/********** Jscex ************/
var Jscex = require("../libs/jscex").Jscex;
var Unjscexify = Jscex.Unjscexify;
var Task = Jscex.Async.Task;
var _ = require("underscore");

var indexAsync = eval(Jscex.compile("async", function (req, res) {
    var page = Number(req.query.page) || 1;
    var limit = config.list_topic_count;
    
    var data = $await(Task.whenAll({
    	topics: topic_ctrl.get_topics_by_query_async({ }, {
	    	skip: (page - 1) * limit,
	        limit: limit,
	        sort: [['last_reply_at', 'desc']]
	    }),
	    hot_topics: topic_ctrl.get_topics_by_query_async({ }, {
	        limit: 5,
	        sort: [['visit_count','desc']]
	    }),
	    stars: user_ctrl.get_users_by_query_async(
	        { is_star: true },
	        { limit: 5 }
	    ),
	    tops: user_ctrl.get_users_by_query_async({ }, {
	        limit: 10,
	        sort: [['score','desc']]
	    }),
	    no_reply_topics: topic_ctrl.get_topics_by_query_async(
	        { reply_count: 0 },
	        { limit: 5, sort: [['create_at','desc']] }
	    ),
	    tags: tag_ctrl.get_all_tags_async(),
	    all_topics_count: topic_ctrl.get_count_by_query_async({ })
    }));

    data.current_page = page;
   	data.list_topic_count = limit;
    data.pages = Math.ceil(data.all_topics_count / limit);

    // 计算最热标签
    data.hot_tags = _.chain(data.tags)
        .sortBy(function (t) { return -t.topic_count; })
        .first(5);

    // 计算最新标签
    data.recent_tags = _.chain(data.tags)
        .sortBy(function (t) { return -t.create_at.valueOf() })
        .first(5);

	res.render('index', data);
}));

exports.index = Unjscexify.toRequestHandler(indexAsync);