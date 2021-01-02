import * as firebaseTesting from "@firebase/rules-unit-testing";
import {
  AppOptions,
  ClearFirestoreDataOptions,
} from "@firebase/rules-unit-testing/dist/src/api";
import firebase from "./firebase";
import fs from "fs";
export { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

export const projectId = "sounds-test",
  databaseName = "test-database",
  auth = { uid: "test-uid", email: "test@example.com" },
  auth2 = { uid: "test-uid-2", email: "test-2@example.com" },
  auth3 = { uid: "test-uid-3", email: "test-3@example.com" };

export function loadProductionDatabaseRules(): Promise<void> {
  return loadDatabaseRules();
}

export async function loadDatabaseRules(rules?: string): Promise<void> {
  rules = rules ?? (await readProductionRules());
  await firebaseTesting.loadDatabaseRules({ rules, databaseName });
}

function readProductionRules(): Promise<string> {
  return new Promise<string>((resolve, reject) =>
    fs.readFile("./database.rules.json", (err, rules) => {
      if (err) {
        reject(err);
      } else {
        resolve(rules.toString());
      }
    })
  );
}

let adminApp: firebase.app.App | undefined;
export function getAdminApp(options: AppOptions = {}): firebase.app.App {
  if (!adminApp) {
    adminApp = firebaseTesting.initializeAdminApp({ databaseName, projectId });
  }
  return adminApp;
}

export function createTestApp(options: AppOptions = {}): firebase.app.App {
  getAdminApp();
  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth,
    databaseName,
    ...options,
  });
  return app;
}

export async function deleteTestApp(
  options: Partial<ClearFirestoreDataOptions> = {}
): Promise<void> {
  await getAdminApp().database().ref().remove();
  adminApp = undefined;
  await firebaseTesting.clearFirestoreData({ projectId, ...options });
  await Promise.all(
    firebaseTesting.apps().map(async (app) => await app.delete())
  );
}

export const appConfig1: object = {
  apiKey: "AIzaSyDK9k4jwbvdkHFDnB51VnY4JkspVQeuU_w",
  authDomain: "sounds-dev.firebaseapp.com",
  databaseURL: "https://sounds-dev-default-rtdb.firebaseio.com",
  projectId: "sounds-dev",
  storageBucket: "sounds-dev.appspot.com",
  messagingSenderId: "207576435007",
  appId: "1:207576435007:web:3cd6a40849dd2d9dd76b8a",
};

export const appConfig2: object = {
  apiKey: "AIzaSyDK9k4jwbvdkHFDnB51VnY4JkspVQeuU_w",
  authDomain: "sounds-dev.firebaseapp.com",
  databaseURL: "https://sounds-dev-default-rtdb.firebaseio.com",
  projectId: "sounds-dev",
  storageBucket: "sounds-dev.appspot.com",
  messagingSenderId: "207576435007",
  appId: "1:207576435007:web:980b324e33ab5f8bd76b8a",
};
