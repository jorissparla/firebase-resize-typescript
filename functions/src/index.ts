import * as functions from "firebase-functions";
import { Storage } from "@google-cloud/storage";
import * as path from "path";
import * as os from "os";
import { spawn } from "child-process-promise";
//import * as cors from "cors";
import * as Busboy from "busboy";
import * as fs from "fs";
const projectId = "doppelganger-32719";
const bucketName = "doppelganger-32719.appspot.com";

const storage = new Storage({
  projectId: projectId
});

export const resizeUploadedImage = functions.storage.object().onFinalize(event => {
  const { bucket, contentType, name } = event;
  const filePath = name || "";
  console.log("Filechanged detected, function execution started");

  if (path.basename(filePath).startsWith("renamed")) {
    console.log("already renamed this file");
    return;
  }
  //const storage = new Storage();
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

export const checkWhatComesIn = functions.https.onRequest((req, res) => {
  var busboy = new Busboy({ headers: req.headers });
  let uploadData: any = null;
  busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
    const filepath = path.join(os.tmpdir(), filename);
    uploadData = { file: filepath, type: mimetype };
    file.pipe(fs.createWriteStream(filepath));
    console.log("busboy on file", uploadData);

    file.on("data", function(data) {
      console.log("File [" + fieldname + "] got " + data.length + " bytes");
    });
    file.on("end", function() {
      console.log("File [" + fieldname + "] Finished");
    });
  });
  busboy.on("field", function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
    console.log("Field [" + fieldname + "]: value: ");
  });
  busboy.on("finish", function() {
    console.log("Done parsing form!");
    console.log("busboy on ffinish");
    const metadata = { contentType: uploadData.type };
    storage
      .bucket(bucketName)
      .upload(uploadData.file, {
        metadata
      })
      .then(([aFile, response]) => {
        if (response.statusCode !== 200) {
          console.log("afile", aFile);
          return res.status(500).json({ error: response.statusMessage });
        }
        return res.status(200).json({ message: response });
      })
      .catch(error => {
        return res.status(500).json({ error });
      });
    // res.writeHead(303, { Connection: "close", Location: "/" });
    console.log("Ending");
    res.end();
  });
  busboy.end(req.body);
});
