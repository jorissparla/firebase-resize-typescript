import * as functions from "firebase-functions";
import { Storage } from "@google-cloud/storage";
import * as path from "path";
import * as os from "os";
import { spawn } from "child-process-promise";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.storage.object().onFinalize(event => {
  const { bucket, contentType, name } = event;
  const filePath = name || "";
  console.log("Filechanged detected, function execution started");

  if (path.basename(filePath).startsWith("renamed")) {
    console.log("already renamed this file");
    return;
  }
  const storage = new Storage();
  const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
  const metadata = { contentType };
  return storage
    .bucket(bucket)
    .file(filePath)
    .download({
      destination: tmpFilePath
    })
    .then(() => {
      return spawn("convert", [tmpFilePath, "-resize", "200x200", tmpFilePath], {}).then(() => {
        return storage.bucket(bucket).upload(tmpFilePath, {
          metadata,
          destination: `renamed-` + path.basename(filePath)
        });
      });
    });
});
export const generateThumbnail = functions.storage.object().onFinalize(object => {
  // ...
  return;
});
