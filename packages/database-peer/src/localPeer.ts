import Peer from "simple-peer";
import * as wrtc from "wrtc";
import { act } from "./util";

export function createPeer(opts: Peer.Options = {}): Peer.Instance {
  return new Peer({ wrtc, ...opts });
}

export function createConnectedLocalPeers(): {
  initiator: Peer.Instance;
  receiver: Peer.Instance;
  connected: Promise<void>;
} {
  const initiator = createPeer({ initiator: true, wrtc, objectMode: true });
  const receiver = createPeer({ wrtc, objectMode: true });

  initiator.on("signal", (data) => receiver.signal(data));
  receiver.on("signal", (data) => initiator.signal(data));

  return {
    initiator,
    receiver,
    connected: Promise.all([
      act((res) => initiator.on("connect", res)),
      act((res) => receiver.on("connect", res)),
    ]).then(),
  };
}
