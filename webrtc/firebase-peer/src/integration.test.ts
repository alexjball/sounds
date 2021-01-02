import { DatabasePeer } from "./databasePeer";
import { Peers, present } from "./databaseSchema";
import firebase from "./firebase";
import { appConfig1, appConfig2 } from "./firebaseTesting";

it("Two users can exchange messages", async () => {
  const app1 = firebase.initializeApp(appConfig1, "test1");
  const app2 = firebase.initializeApp(appConfig2, "test2");

  const peer1 = new DatabasePeer(
    app1.database(),
    await app1
      .auth()
      .signInWithEmailAndPassword("test1@example.com", "password")
      .then((cred) => cred.user!)
  );

  const peer2 = new DatabasePeer(
    app2.database(),
    await app2
      .auth()
      .signInWithEmailAndPassword("test2@example.com", "password")
      .then((cred) => cred.user!)
  );

  const channelName = "shared-channel";
  const peers: Peers = { [peer1.user.uid]: present, [peer2.user.uid]: present };

  const room1 = await peer1.createRoom({
    auth: {
      owner: peer1.user.uid,
      peers,
    },
  });
  await peer1.openChannel(room1.key!, channelName, { peers });

  const room2 = await peer2.joinRoom(room1.key!);

  let messageReceived: any;
  const receivedMessage = new Promise((resolve, reject) => {
    messageReceived = resolve;
  });

  await peer2.subscribeToChannel(room2.key!, channelName, messageReceived);

  const expectedMessage = { message: "test" };
  await peer1.publishMessage(room1.key!, channelName, expectedMessage);

  await expect(receivedMessage).resolves.toEqual(expectedMessage);
});
