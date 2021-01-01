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
