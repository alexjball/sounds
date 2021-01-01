import { createConnectedLocalPeers, createPeer } from "./localPeer";
import { act, timeout } from "./util";

describe("localPeer", () => {
  it("can create peer", () => {
    expect(createPeer()).toBeDefined();
  });

  it("initiator sends initial signal", async () => {
    const peer = createPeer({ initiator: true });
    const signal = await timeout(10, (res) =>
      peer.on("signal", (data) => res(data))
    );
    expect(signal).toBeDefined();
  });

  it("receiver waits for initiator", async () => {
    const initiator = createPeer({ initiator: true });
    const receiver = createPeer();

    const initiatorSignal = act<string>((res) =>
      initiator.on("signal", (data) => res(data))
    );

    const receiverSignal = act((res) =>
      receiver.on("signal", (data) => res(data))
    );

    await expect(timeout(100, receiverSignal)).rejects;

    receiver.signal(await initiatorSignal);

    await expect(timeout(10, receiverSignal)).resolves.toBeDefined();
  });

  it("local initiator and peer eventually connect", async () => {
    const { connected } = createConnectedLocalPeers();
    await connected;
  });

  it("connected peers can send data", async () => {
    const message = "Hello!";

    const { connected, initiator, receiver } = createConnectedLocalPeers();

    await connected;

    initiator.send(message);

    const receivedMessage = act<string>((res) =>
      receiver.on("data", (data) => res(data))
    );

    await expect(receivedMessage).resolves.toBe(message);
  });

  it("fails to send data before connect", async () => {
    const { initiator, receiver } = createConnectedLocalPeers();
    expect(() => initiator.send("foo")).toThrow();
    expect(() => receiver.send("foo")).toThrow();
  });

  it.each(["initiator", "receiver"])(
    "%s closes after the other side does",
    async (waiting) => {
      const peers = createConnectedLocalPeers();

      const closingSide =
          waiting === "initiator" ? peers.receiver : peers.initiator,
        waitingSide =
          waiting === "initiator" ? peers.initiator : peers.receiver,
        waitingSideClosed = act((res) => waitingSide.on("close", res));

      await peers.connected;

      closingSide.destroy();

      await waitingSideClosed;
    }
  );
});
