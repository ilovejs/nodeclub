var Jscex = require("jscex");
require("jscex-jit").init(Jscex);
require("jscex-async").init(Jscex);
require("jscex-async-powerpack").init(Jscex);

var Jscexify = Jscex.Async.Jscexify,
    Logger = Jscex.Logging.Logger,
    LogLevel = Jscex.Logging.Level;

var path = require("path"),
    fs = require("fs"),
    util = require("util"),
    mongoose = require("mongoose"),
    moment = require("moment");

// Logging
var logDir = path.join(__dirname, "..", "logs");
if (!path.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

var now = moment();
var logFileName = "jscex-" + now.format("YYYYMMdd-hhmmss.log");
var logPath = path.join(logDir, logFileName);
console.log("Jscex debugging logs: " + logPath);
var logStream = fs.createWriteStream(logPath);

Logger.prototype.log = function (level, msg) {
    if (level == LogLevel.DEBUG) {
        logStream.write(msg, "utf8");
    } else {
        console.log(msg);
    }
}

// mongoose extensions
var mp = mongoose.Model.prototype;
mp.saveAsync = Jscexify.fromStandard(mp.save);
mp.removeAsync = Jscexify.fromStandard(mp.remove);

var m = mongoose.Model;
m.findByIdAsync = Jscexify.fromStandard(m.findById);
m.findOneAsync = Jscexify.fromStandard(m.findOne);
m.findAsync = Jscexify.fromStandard(m.find);
m.countAsync = Jscexify.fromStandard(m.count);

// Unjscexify
Jscex.Unjscexify = {
    toRequestHandler: function (fn) {
        return function (req, res, next) {
            fn(req, res).addEventListener("failure", function () {
                next(this.error);
            }).start();
        }
    }
}

exports.Jscex = Jscex;