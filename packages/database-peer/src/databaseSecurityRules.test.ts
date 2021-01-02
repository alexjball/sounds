import { DatabasePeer } from "./databasePeer";
import { Channel, Room, RoomAuthorization } from "./databaseSchema";
import { Reference, Database } from "./firebase";
import {
  createTestApp,
  deleteTestApp,
  getAdminApp,
  loadDatabaseRules,
  loadProductionDatabaseRules,
  auth,
  auth2,
  auth3,
} from "./firebaseTesting";

afterEach(() => deleteTestApp());

describe("Security Rules", () => {
  describe("Required Authentication", () => {
    beforeAll(() =>
      loadDatabaseRules(`
        {
          "rules": {
            "test": {
              ".read": "auth.uid !== null",
              ".write": "auth.uid !== null"
            },
            "test2": {
              ".write": "false",
              ".read": "false"
            }
          }    
        }`)
    );

    it("allows authenticated writes", async () => {
      const db = createTestApp().database();
      await expect(db.ref("test").set("value")).toResolve();
    });

    it("allows authenticated reads", async () => {
      const db = createTestApp().database();
      await expect(db.ref("test").set("value")).toResolve();

      const db2 = createTestApp().database();
      const doc = await db2.ref("test").get();
      expect(doc.val()).toBe("value");
    });

    it("denies unauthenticated writes", async () => {
      const db = createTestApp({ auth: null! }).database();
      const error = await db
        .ref("test")
        .set("value")
        .catch((e) => e);

      expect(error).toBeInstanceOf(Error);
    });

    it("denies unauthenticated reads", async () => {
      const db = createTestApp().database();
      await db.ref("test").set("value");

      const unauthed = createTestApp({ auth: null! }).database();

      const error = await unauthed
        .ref("test")
        .get()
        .catch((e) => e);

      expect(error).toBeInstanceOf(Error);
    });

    it("allows all access to admins", async () => {
      const db = createTestApp().database();
      const adminDb = getAdminApp().database();

      await expect(db.ref("test2").set("value")).toReject();
      await expect(db.ref("test2").get()).toReject();
      await expect(adminDb.ref("test2").set("value")).toResolve();
      await expect(adminDb.ref("test2").get()).toResolve();
    });
  });

  describe("Cascading Rules", () => {
    beforeAll(() =>
      loadDatabaseRules(`
        {
          "rules": {
            "test": {
              ".read": "true",
              ".write": "false",

              "field1": {
                ".write": "true",
                ".read": "false",
              }
            }
          }    
        }`)
    );

    let db: Database;
    beforeEach(() => (db = createTestApp().database()));

    it("denies writes to test", async () => {
      await expect(db.ref("test").set("value")).toReject();
    });

    it("allows reads to test", async () => {
      await expect(db.ref("test").get()).toResolve();
    });

    it("allows writes to field under test", async () => {
      await expect(db.ref("test/field1").set("value")).toResolve();
    });

    it("allows reads to field under test", async () => {
      await expect(db.ref("test/field1").get()).toResolve();
    });
  });

  describe("Rooms", () => {
    beforeAll(() => loadProductionDatabaseRules());

    let db: Database, adminDb: Database;
    beforeEach(() => {
      db = createTestApp({ auth }).database();
      adminDb = getAdminApp().database();
    });

    const expectedRoom: Room = {
      auth: { owner: auth.uid, peers: { [auth.uid]: true, [auth2.uid]: true } },
    };

    it("authenticated users can create", async () => {
      const ref = await db.ref("rooms").push(expectedRoom);

      const createdRoom = await adminDb
        .ref(`rooms/${ref.key}`)
        .get()
        .then((data) => data.val());

      expect(createdRoom).toEqual(expectedRoom);
    });

    it("authenticated users can create multiple rooms", async () => {
      await expect(db.ref("rooms").push(expectedRoom)).toResolve();
      await expect(db.ref("rooms").push(expectedRoom)).toResolve();
    });

    it("peers can read", async () => {
      const db2 = createTestApp({ auth: auth2 }).database();

      const ref = await db.ref("rooms").push(expectedRoom);

      const createdRoom = await db2
        .ref(`rooms/${ref.key}`)
        .get()
        .then((doc) => doc.val());

      expect(createdRoom).toEqual(expectedRoom);
    });

    it("rejects unauthorized users", async () => {
      const db3 = createTestApp({ auth: auth3 }).database();
      const ref = await db.ref("rooms").push(expectedRoom);
      await expect(db3.ref(`rooms/${ref.key}`).get()).toReject();
    });

    it("owners can update auth", async () => {
      const db2 = createTestApp({ auth: auth2 }).database();

      const newAuth: RoomAuthorization = {
        owner: auth2.uid,
        peers: { [auth2.uid]: true },
      };
      const ref = await db.ref("rooms").push(expectedRoom);

      await ref.child("auth").set(newAuth);

      await expect(ref.child("auth").get()).toReject();
      await expect(
        db2
          .ref(`rooms/${ref.key}/auth`)
          .get()
          .then((doc) => doc.val())
      ).resolves.toEqual(newAuth);
    });
  });

  describe("Channels", () => {
    beforeAll(() => loadProductionDatabaseRules());

    const expectedRoom: Room = {
      auth: { owner: auth.uid, peers: { [auth.uid]: true, [auth2.uid]: true } },
    };

    let db: Database, roomRef: Reference;
    beforeEach(async () => {
      db = createTestApp({ auth }).database();
      roomRef = await db.ref("rooms").push(expectedRoom);
    });

    it("Room peers can create channels", async () => {
      const db2 = createTestApp({ auth: auth2 }).database();
      const channel: Channel = { peers: { [auth2.uid]: true } };
      await expect(
        db2.ref(`rooms/${roomRef.key}/channels/test-channel`).set(channel)
      ).toResolve();
    });

    it("non-Room peers cannot create channels", async () => {
      const db3 = createTestApp({ auth: auth3 }).database();
      const channel: Channel = { peers: { [auth3.uid]: true } };
      await expect(
        db3.ref(`rooms/${roomRef.key}/channels/test-channel`).set(channel)
      ).toReject();
    });

    it("channel peers can edit channels", async () => {
      const channel: Channel = { peers: { [auth.uid]: true } };
      const ref = await db.ref(`rooms/${roomRef.key}/channels`).push(channel);
      await expect(
        ref.update({ peers: { [auth.uid]: true, [auth2.uid]: true } })
      ).toResolve();
    });

    it("non-channel peers cannot edit channels", async () => {
      const db2 = createTestApp({ auth: auth2 }).database();
      const channel: Channel = { peers: { [auth.uid]: true } };
      const ref = await db.ref(`rooms/${roomRef.key}/channels`).push(channel);

      await expect(
        db2
          .ref(`rooms/${roomRef.key}/channels/${ref.key}`)
          .set({ peers: { [auth2.uid]: true } })
      ).toReject();
    });
  });

  describe("Messages", () => {
    beforeAll(() => loadProductionDatabaseRules());

    const expectedPayload = { message: "test" };
    const expectedChannel = "test-channel";
    const expectedRoom: Room = {
      auth: { owner: auth.uid, peers: { [auth.uid]: true, [auth2.uid]: true } },
      channels: {
        [expectedChannel]: {
          peers: { [auth.uid]: true, [auth2.uid]: true },
        },
      },
    };

    let db: Database, roomRef: Reference, path: string;
    beforeEach(async () => {
      db = createTestApp({ auth }).database();
      roomRef = await db.ref("rooms").push(expectedRoom);
      path = `messages/${roomRef.key}/${expectedChannel}`;
    });

    it("Channel peers can read and write messages", async () => {
      const db2 = createTestApp({ auth: auth2 }).database();
      const message = db2.ref(path).push(expectedPayload);

      await expect(message).toResolve();

      const actual = db
        .ref(`${path}/${message.key}`)
        .get()
        .then((doc) => doc.val());

      await expect(actual).resolves.toEqual(expectedPayload);
    });

    it("Non-channel peers cannot read or write messages", async () => {
      const db3 = createTestApp({ auth: auth3 }).database();

      await expect(db3.ref(path).push(expectedPayload)).toReject();

      const message = await db.ref(path).push(expectedPayload);

      await expect(db3.ref(`${path}/${message.ref}`).get()).toReject();
    });

    it("Channel peers can stream sequential messages", async () => {
      const peer1 = new DatabasePeer(db, auth);
      const db2 = createTestApp({ auth: auth2 }).database();
      const peer2 = new DatabasePeer(db2, auth2);
      const numMessages = 10;
      const actualMessages: unknown[] = [],
        expectedMessages: unknown[] = [];

      let subscription: any;
      const doneStreaming = new Promise<void>((resolve, reject) => {
        subscription = peer2.subscribeToChannel(
          roomRef.key!,
          expectedChannel,
          (message) => {
            actualMessages.push(message);
            if (actualMessages.length === numMessages) {
              resolve();
            }
          }
        );
      });

      await subscription;

      for (let i = 0; i < numMessages; i++) {
        const message = { message: i };
        expectedMessages.push(message);
        await peer1.publishMessage(roomRef.key!, expectedChannel, message);
      }
      await doneStreaming;

      expect(actualMessages).toEqual(expectedMessages);
    });

    it("Non-channel peers cannot stream messages", async () => {
      const db3 = createTestApp({ auth: auth3 }).database();
      const peer3 = new DatabasePeer(db3, auth3);

      await expect(
        peer3.subscribeToChannel(roomRef.key!, expectedChannel, fail)
      ).toReject();
    });
  });
});
