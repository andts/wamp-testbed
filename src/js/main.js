var wampSession = null;
var currentPrefix = null;
var currentTopic = null;

$(function () {
    //init ui listeners
    $(".connection .connect").click(function () {
        if (Modernizr.websockets) {
            var form = $(this).parents(".connection");
            var serverName = form.find("#wampServer").val();
            var user = form.find("#wampServerLogin").val();
            var pass = form.find("#wampServerPassword").val();
            connect(serverName, user, pass);
        } else {
            showNotification("Sorry, seems like your browser does not support websockets ");
        }
    });

    $(".rpc .call").click(function () {
        if (wampSession) {
            var form = $(this).parents(".rpc");
            var procName = form.find("#procName").val();
            var procParams = form.find("#procParams").val();
            rpcCall(procName, procParams, currentPrefix);
        } else {
            showNotification("Not connected to WAMP server ");
        }
    });

    $(".add-prefix-form .add-prefix").click(function () {
        if (wampSession) {
            var form = $(this).parents(".add-prefix-form");
            var prefix = form.find("#prefix").val();
            var uri = form.find("#prefixUri").val();
            addPrefix(prefix, uri);
        } else {
            showNotification("Not connected to WAMP server ");
        }
    });

    $(".subscribe-form .subscribe").click(function () {
        if (wampSession) {
            var form = $(this).parents(".subscribe-form");
            var uri = form.find("#topicUri").val();
            subscribe(uri);
        } else {
            showNotification("Not connected to WAMP server ");
        }
    });

    $(".publish-form .publish").click(function () {
        if (wampSession) {
            if (currentTopic) {
                var form = $(this).parents(".publish-form");
                var msg = form.find("#pubMessage").val();
                publish(currentTopic, msg);
            } else {
                showNotification("Choose a topic first ");
            }
        } else {
            showNotification("Not connected to WAMP server ");
        }
    });
});

function subscribe(topic) {
    if (currentPrefix && topic.indexOf(":") == -1) {
        topic = currentPrefix + ":" + topic;
    }
    wampSession.subscribe(topic, topicCallback);
    logMessage("Subscribe to topic " + topic, "info");
    var topicItem =
        "<li class='list-group-item topic active' data-topic='" + topic + "'>"
            + topic + "<span class='badge unsubscribe' title='Unsubscribe'>&times;</span></li>";
    $(".topics .topic").removeClass("active");
    $(".topics").append(topicItem);
    currentTopic = topic;
    bindTopicListeners(topic);
}

function bindTopicListeners(topic) {
    var topicItem = $(".topics .topic[data-topic='" + topic + "']");
    topicItem.click(function () {
        var item = $(this);
        if (item.hasClass("active")) {
            $(".topics .topic").removeClass("active");
            currentTopic = null;
        } else {
            $(".topics .topic").removeClass("active");
            item.toggleClass("active");
            currentTopic = item.data("topic");
        }
        return false;
    });

    topicItem.find(".unsubscribe").click(function () {
        var item = $(this).parents(".topic");
        var uri = item.data("topic");
        if (item.hasClass("active")) {
            currentTopic = null;
        }
        unsubscribe(uri);
        item.remove();
        return false;
    });
}

function topicCallback(topic, event) {
    logMessage("Message in topic " + topic + ": " + JSON.stringify(event), "success");
}

function unsubscribe(topic) {
    wampSession.unsubscribe(topic);
    logMessage("Unsubscribe from topic " + topic, "info");
}

function publish(topic, event) {
    wampSession.publish(topic, event);
    logMessage("Publish event " + event + " to topic " + topic, "info");
}

function addPrefix(prefix, uri) {
    //TODO: add nanoscroll plugin for prefixes and topics scrolling
    //TODO: think about knockout mvc model for prefixes and topics?
    wampSession.prefix(prefix, uri);
    logMessage("Register prefix " + prefix + " -> " + uri, "info");
    var prefixItem =
        "<li class='list-group-item prefix' data-prefix='" + prefix + "'>\
        <strong>" + prefix + "</strong> <span class='glyphicon glyphicon-arrow-right'></span> <em>" + uri + "</em>\
        <span class='badge remove-prefix' title='Remove prefix'>&times;</span></li>";
    $(".prefixes").append(prefixItem);
    bindPrefixListener(prefix);
}

function bindPrefixListener(prefix) {
    $(".prefixes .prefix[data-prefix='" + prefix + "']").click(function () {
        var item = $(this);
        if (item.hasClass("active")) {
            $(".prefixes .prefix").removeClass("active");
            currentPrefix = null;
        } else {
            $(".prefixes .prefix").removeClass("active");
            item.addClass("active");
            currentPrefix = item.data("prefix");
        }
    });
}

function rpcCall(procedure, parameters, prefix) {
    if (prefix && procedure.indexOf(":") == -1) {
        procedure = prefix + ":" + procedure;
    }
    logMessage("Call " + procedure + "(" + parameters + ")");
    wampSession.call(procedure, parameters).then(
        function (res) {
            logMessage("Response for " + procedure + " = " + JSON.stringify(res), "success");
        },
        function (res) {
            logMessage("Error on " + procedure + ": " + JSON.stringify(res), "danger");
        }
    );
}

function connect(serverName, user, pass) {
    logMessage("Connect to " + serverName);
    ab.connect(
        serverName,
        //Connection callback
        function (session) {
            wampSession = session;

            //send authreq rpc call
            if (user && pass) {
                wampSession.authreq(user).then(
                    function (challenge) {
                        var signature = wampSession.authsign(pass, challenge);

                        //send auth rpc call
                        wampSession.auth(signature).then(
                            function (permissions) {
                                //do some init
                                //from clj-wamp example
                                addPrefix("rpc", "http://clj-wamp-example/rpc#");
                                addPrefix("event", "http://clj-wamp-example/event#");
                            },
                            function () {
                                logMessage("Authentication failed", "danger");
                            });
                    },
                    function () {
                        logMessage("AuthRequest failed", "danger");
                    });
            }

            logMessage("Connected to " + serverName + ", sessionId = " + wampSession.sessionid(), "success");
        },
        //Disconnection callback
        function (code, reason) {
            wampSession = null;
            logMessage("Connection lost, code = " + code + " reason = " + reason, "danger");
        },
        //Options
        {'maxRetries': 60, 'retryDelay': 30000}
    )
}

//custom logging to action log
function logMessage(text, type) {
    type = type || "info";
    $(".action-log .log-content").prepend(createLogMessage(text, type));
}

function createLogMessage(text, type) {
    //src http://stackoverflow.com/questions/10073699
    function zeroPad(n, width) {
        var z = '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    var currentDate = new Date();
    var dateText = "[" + zeroPad(currentDate.getHours(), 2) +
        ":" + zeroPad(currentDate.getMinutes(), 2) +
        ":" + zeroPad(currentDate.getSeconds(), 2) +
        "." + zeroPad(currentDate.getMilliseconds(), 3) + "]";

    return "<div class='alert alert-" + type + "'><span class='time'>" + dateText +
        "</span>&nbsp;<a class='text'>" + text + "</a></div>";
}

function showNotification(message) {
    $('.global-alert').notify({
        message: message,
        type: 'danger',
        closable: false,
        transition: 'fade',
        fadeOut: {
            enabled: true,
            delay: 3000
        }
    }).show();
}
