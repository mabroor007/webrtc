// Definations
function $(identifier) {
    return document.querySelector(identifier);
}
// just combining some static initializers under the name Peer
var Peer = /** @class */ (function () {
    function Peer() {
    }
    Peer.createPeer = function (channels) {
        if (!channels)
            throw new Error("No channels found!");
        var connection = new RTCPeerConnection();
        var chns = [];
        var _loop_1 = function (channel) {
            var chan = connection.createDataChannel(channel.name);
            chan.onopen = function () {
                channel.onOpen(chan);
            };
            chan.onmessage = function (e) {
                channel.onMessage(String(e.data));
            };
            chan.onclose = channel.onClose;
            chns.push(chan);
        };
        for (var _i = 0, channels_1 = channels; _i < channels_1.length; _i++) {
            var channel = channels_1[_i];
            _loop_1(channel);
        }
        var createOffer = function (onOffer) {
            connection.onicecandidate = function () {
                onOffer(connection.localDescription);
            };
            connection.createOffer().then(function (offer) {
                connection.setLocalDescription(offer);
            });
        };
        var setRemoteDescription = function (desc) {
            connection.setRemoteDescription(desc);
        };
        return { createOffer: createOffer, setRemoteDescription: setRemoteDescription };
    };
    Peer.createPeerByConnecting = function (onChan) {
        var connection = new RTCPeerConnection();
        connection.ondatachannel = function (e) {
            onChan(e.channel);
        };
        var createAnswer = function (onAnswer) {
            connection.createAnswer().then(function (desc) {
                connection.setLocalDescription(desc);
                onAnswer(desc);
            });
        };
        var setRemoteDescription = function (desc) {
            connection.setRemoteDescription(desc);
        };
        return { createAnswer: createAnswer, setRemoteDescription: setRemoteDescription };
    };
    return Peer;
}());
// initilaizer
function initializeChannels() {
    return [
        {
            name: "test",
            onOpen: function (chan) {
                console.log("Test channel opened!");
                $I("send-btn").addEventListener("click", function () {
                    var msg = $I("msg-input").value;
                    chan.send(msg);
                    $I("msg-input").value = "";
                    $("#chat").innerHTML =
                        $("#chat").innerHTML +
                            ("<div class=\"text-sm m-2 text-black text-right rounded underline\">" + msg + "</div>");
                });
            },
            onMessage: function (msg) {
                insertMsg(msg);
            },
            onClose: function () { return console.log("test channel closed"); }
        },
    ];
}
// utils
function $S(id) {
    return document.getElementById(id).style;
}
function $I(id) {
    return document.getElementById(id);
}
function updateClipboard(stuff) {
    navigator.clipboard.writeText(JSON.stringify(stuff));
}
function setStatus(stuff) {
    $S("status").display = "block";
    $("#status").innerHTML = stuff;
    // delay
    setTimeout(function () {
        $("#status").innerHTML = "";
        $S("status").display = "none";
    }, 3000);
}
function insertMsg(msg) {
    $("#chat").innerHTML =
        $("#chat").innerHTML +
            ("<div class=\"text-sm m-2 bg-white text-black rounded underline\">" + msg + "</div>");
}
// linking with the ui
$("#create-offer-btn").addEventListener("click", function () {
    // creating connection
    var connection = Peer.createPeer(initializeChannels());
    connection.createOffer(function (offer) {
        updateClipboard(offer);
        // updating ui
        $S("create-offer-btn").display = "none";
        $S("connect-btn").display = "none";
        $S("answer-in-page").display = "flex";
        setStatus("Offer copied to clipboard");
    });
    $("#answer-ok-btn").addEventListener("click", function () {
        try {
            var val = $I("answer-input").value;
            var ans = JSON.parse(val);
            connection.setRemoteDescription(ans);
            $S("answer-in-page").display = "none";
            $S("message-page").display = "flex";
        }
        catch (e) {
            setStatus("Invalid Answer!");
        }
    });
});
$("#connect-btn").addEventListener("click", function () {
    $S("connect-btn").display = "none";
    $S("create-offer-btn").display = "none";
    $S("connect-page").display = "flex";
});
$("#offer-accept-btn").addEventListener("click", function () {
    var val = $I("offer-input").value;
    try {
        var offer = JSON.parse(val);
        var connection = Peer.createPeerByConnecting(function (chan) {
            if (chan.label === "test") {
                chan.onmessage = function (msg) {
                    insertMsg(String(msg.data));
                };
                chan.onopen = function () {
                    console.log("Test channel opened");
                    $I("send-btn").addEventListener("click", function () {
                        chan.send($I("msg-input").value);
                        $("#chat").innerHTML =
                            $("#chat").innerHTML +
                                ("<div class=\"text-sm m-2 text-black text-right rounded underline\">" + $I("msg-input").value + "</div>");
                        $I("msg-input").value = "";
                    });
                };
            }
        });
        connection.setRemoteDescription(offer);
        // answer the offer
        connection.createAnswer(function (answer) {
            setStatus("Answer copied to clipboard");
            updateClipboard(answer);
        });
        $S("connect-page").display = "none";
        $S("message-page").display = "flex";
    }
    catch (e) {
        return setStatus("Invalid offer!");
    }
});
