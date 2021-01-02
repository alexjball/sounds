import firebase from "firebase/app";

import "firebase/firestore";
import "firebase/database";
import "firebase/auth";

export default firebase;

export type Database = firebase.database.Database;
export type Reference = firebase.database.Reference;
export type Query = firebase.database.Query;
export type DataSnapshot = firebase.database.DataSnapshot;
