import {
  Room,
  User,
  References,
  Key,
  present,
  Channel,
  Message,
} from "./databaseSchema";
import { Database, DataSnapshot, Query, Reference } from "./firebase";
import assert from "assert";

export type OnMessage = (message: Message) => void;

export class Subscription {
  private query: Query;
  private onMessage: OnMessage;
  private startup?: Promise<void>;
  private callback?: (snapshot: DataSnapshot) => void;

  public constructor(query: Query, onMessage: OnMessage) {
    this.query = query;
    this.onMessage = onMessage;
  }

  public start(): Promise<void> {
    if (!this.startup) {
      this.startup = new Promise((resolve, reject) => {
        let isFirstSnapshot = true;
        this.callback = (snapshot) => {
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            resolve();
          } else {
            const data = snapshot.val(),
              message = data ? Object.values(data)[0] : null;
            this.onMessage(message);
          }
        };
        const cancelCallback = (error: unknown): void => {
          reject(error);
          this.stop();
        };
        this.query.on("value", this.callback, cancelCallback);
      });
    }
    return this.startup;
  }

  public stop(): void {
    if (this.startup || this.callback) {
      this.query.off("value", this.callback);
      this.callback = this.startup = undefined;
    }
  }
}

export class DatabasePeer {
  public readonly user: User;
  private refs: References;

  public constructor(db: Database, user: User) {
    this.user = user;
    this.refs = new References(db);
  }

  public async createRoom(
    room: Room = {
      auth: { owner: this.user.uid, peers: { [this.user.uid]: present } },
    }
  ): Promise<Reference> {
    return await this.refs.rooms().push(room);
  }

  public async joinRoom(roomKey: Key): Promise<Reference> {
    const ref = this.refs.room(roomKey);
    assert((await ref.get()).exists(), `Room ${roomKey} does not exist`);
    return ref;
  }

  public async openChannel(
    roomKey: Key,
    channelKey: Key,
    channel: Channel
  ): Promise<Reference> {
    channel.peers[this.user.uid] = present;
    return await this.refs.channel(roomKey, channelKey).set(channel);
  }

  public async publishMessage(
    roomKey: Key,
    channelKey: Key,
    message: Message
  ): Promise<Reference> {
    return await this.refs.messages(roomKey, channelKey).push(message);
  }

  public async subscribeToChannel(
    roomKey: Key,
    channelKey: Key,
    onMessage: OnMessage
  ): Promise<Subscription> {
    const subscription = new Subscription(
      this.refs.messages(roomKey, channelKey).orderByKey().limitToLast(1),
      onMessage
    );
    await subscription.start();
    return subscription;
  }
}
