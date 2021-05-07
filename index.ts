// Definations
function $(identifier: string) {
  return document.querySelector(identifier);
}

interface DataChannel {
  name: string;
  onMessage: (msg: any) => void;
  onOpen: (chan: RTCDataChannel) => void;
  onClose: () => void;
}

interface Offer {
  type?: string;
  sdp?: string;
}

// just combining some static initializers under the name Peer
class Peer {
  static createPeer(channels: DataChannel[]) {
    if (!channels) throw new Error("No channels found!");

    const connection: RTCPeerConnection = new RTCPeerConnection();
    const chns: RTCDataChannel[] = [];

    for (let channel of channels) {
      const chan = connection.createDataChannel(channel.name);
      chan.onopen = () => {
        channel.onOpen(chan);
      };
      chan.onmessage = (e) => {
        channel.onMessage(String(e.data));
      };
      chan.onclose = channel.onClose;
      chns.push(chan);
    }

    const createOffer = (onOffer: (offer: Offer) => void) => {
      connection.onicecandidate = () => {
        onOffer(connection.localDescription);
      };
      connection.createOffer().then((offer) => {
        connection.setLocalDescription(offer);
      });
    };
    const setRemoteDescription = (desc: RTCSessionDescriptionInit) => {
      connection.setRemoteDescription(desc);
    };

    return { createOffer, setRemoteDescription };
  }

  static createPeerByConnecting(onChan: (chan: RTCDataChannel) => void) {
    const connection = new RTCPeerConnection();

    connection.ondatachannel = (e) => {
      onChan(e.channel);
    };

    const createAnswer = (onAnswer: (answer: Offer) => void) => {
      connection.createAnswer().then((desc) => {
        connection.setLocalDescription(desc);
        onAnswer(desc);
      });
    };

    const setRemoteDescription = (desc: RTCSessionDescriptionInit) => {
      connection.setRemoteDescription(desc);
    };

    return { createAnswer, setRemoteDescription };
  }
}

// initilaizer
function initializeChannels(): DataChannel[] {
  return [
    {
      name: "test",
      onOpen: (chan) => {
        console.log("Test channel opened!");
        $I("send-btn").addEventListener("click", () => {
          const msg = $I("msg-input").value;
          chan.send(msg);
          $I("msg-input").value = "";
          $("#chat").innerHTML =
            $("#chat").innerHTML +
            `<div class="text-sm m-2 text-black text-right rounded underline">${msg}</div>`;
        });
      },
      onMessage: (msg: string) => {
        insertMsg(msg);
      },
      onClose: () => console.log("test channel closed"),
    },
  ];
}

// utils
function $S(id: string): CSSStyleDeclaration {
  return document.getElementById(id).style;
}
function $I(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}
function updateClipboard(stuff: any) {
  navigator.clipboard.writeText(JSON.stringify(stuff));
}
function setStatus(stuff: string) {
  $S("status").display = "block";
  $("#status").innerHTML = stuff;
  // delay
  setTimeout(() => {
    $("#status").innerHTML = "";
    $S("status").display = "none";
  }, 3000);
}
function insertMsg(msg: string) {
  $("#chat").innerHTML =
    $("#chat").innerHTML +
    `<div class="text-sm m-2 bg-white text-black rounded underline">${msg}</div>`;
}

// linking with the ui
$("#create-offer-btn").addEventListener("click", () => {
  // creating connection
  const connection = Peer.createPeer(initializeChannels());
  connection.createOffer((offer) => {
    updateClipboard(offer);
    // updating ui
    $S("create-offer-btn").display = "none";
    $S("connect-btn").display = "none";
    $S("answer-in-page").display = "flex";

    setStatus("Offer copied to clipboard");
  });
  $("#answer-ok-btn").addEventListener("click", () => {
    try {
      const val = $I("answer-input").value;
      const ans = JSON.parse(val);
      connection.setRemoteDescription(ans);
      $S("answer-in-page").display = "none";
      $S("message-page").display = "flex";
    } catch (e) {
      setStatus("Invalid Answer!");
    }
  });
});

$("#connect-btn").addEventListener("click", () => {
  $S("connect-btn").display = "none";
  $S("create-offer-btn").display = "none";
  $S("connect-page").display = "flex";
});

$("#offer-accept-btn").addEventListener("click", () => {
  const val = $I("offer-input").value;
  try {
    const offer = JSON.parse(val);
    const connection = Peer.createPeerByConnecting((chan) => {
      if (chan.label === "test") {
        chan.onmessage = (msg) => {
          insertMsg(String(msg.data));
        };
        chan.onopen = () => {
          console.log("Test channel opened");
          $I("send-btn").addEventListener("click", () => {
            chan.send($I("msg-input").value);
            $("#chat").innerHTML =
              $("#chat").innerHTML +
              `<div class="text-sm m-2 text-black text-right rounded underline">${
                $I("msg-input").value
              }</div>`;
            $I("msg-input").value = "";
          });
        };
      }
    });
    connection.setRemoteDescription(offer);
    // answer the offer
    connection.createAnswer((answer: any) => {
      setStatus("Answer copied to clipboard");
      updateClipboard(answer);
    });
    $S("connect-page").display = "none";
    $S("message-page").display = "flex";
  } catch (e) {
    return setStatus("Invalid offer!");
  }
});
