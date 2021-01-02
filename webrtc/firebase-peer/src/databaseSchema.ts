import { Database, Reference } from "./firebase";

/**
 * peers send messages to each other over channels in a room.
 */
export interface DatabaseSchema {
  rooms: {
    [roomKey: string]: Room;
  };

  /** Clients push messages to channels. */
  messages: {
    [roomKey: string]: {
      /**
       * Clients listen for messages on a particular channel. recipientKey is
       * peerKey for p2p messages. It is a group or shared key for broadcasts.
       */
      [channelKey: string]: {
        [messageKey: string]: Message;
      };
    };
  };
}

/**
 * Rooms faciliatate communication between authorized users.
 */
export interface Room {
  auth: RoomAuthorization;

  /** Clients pass messages over channels. */
  channels?: {
    [channelKey: string]: Channel;
  };
}

export interface RoomAuthorization {
  /** Owners can configure and manage the room. */
  owner: Uid;
  /** Peers can access and use the resource. Owner must be listed as a peer*/
  peers: Peers;
}

export interface Channel {
  peers: Peers;
}

/** A collection of peers */
export interface Peers {
  [uid: string]: Void;
}

export type Message = unknown;
export type Void = unknown;
export type Uid = string;
export type Key = string;

export const present: Void = true;
export interface User {
  uid: Uid;
}

export class References {
  private db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public rooms(): Reference {
    return this.db.ref("rooms");
  }

  public room(roomKey: string): Reference {
    return this.db.ref(`rooms/${roomKey}`);
  }

  public channel(roomKey: Key, channelKey: Key): Reference {
    return this.db.ref(`rooms/${roomKey}/channels/${channelKey}`);
  }

  public messages(roomKey: Key, channelKey: Key): Reference {
    return this.db.ref(`messages/${roomKey}/${channelKey}`);
  }
}
