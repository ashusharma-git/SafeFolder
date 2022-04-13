const express = require("express");
const app = express();
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");

const ipfsAPI = require("ipfs-api");
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });
const QRCode = require("qrcode");

app.set("view engine", "ejs");
app.use(express.static("public"));
const mongoURI = "mongodb://localhost:27017/ipfsHash";
// Create mongo connection
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("DB connected...");
  })
  .catch((err) => {
    console.log("DB connection failled!!", err);
  });

const ipfsHashSchema = new mongoose.Schema({
  fileHash: String,
});
const FileHash = mongoose.model("FileHash", ipfsHashSchema);
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = `uploads/`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, `uploads/`);
  },
  filename: function (req, file, cb) {
    let ext = file.originalname.substring(
      file.originalname.lastIndexOf("."),
      file.originalname.length
    );
    cb(null, file.originalname);
  },
});
const fileUpload = multer({
  storage: storage,
});

app.get("/", (req, res) => {
  res.render("index", { page: "upload" });
});
app.post("/", fileUpload.any(), (req, res) => {
  var data = Buffer.from(fs.readFileSync(req.files[0].path));
  ipfs.add(data, (err, result) => {
    if (err) console.log(err);
    else {
      const fileHash = new FileHash({
        fileHash: result[0].hash,
      });
      fileHash
        .save()
        .then(async () => {
          fs.unlink(`${req.files[0].path}`, (err) => {
            if (err) console.log(err);
          });
          const qr = await generateQR(`https://ipfs.io/ipfs/${result[0].hash}`);
          // console.log(qr);
          res.render("index", {
            page: "viewQR",
            qr: qr,
            hash: `https://ipfs.io/ipfs/${result[0].hash}`,
          });
        })
        .catch((err) => console.log(err));
    }
  });
});

const generateQR = async (url) => {
  try {
    const qr = await QRCode.toDataURL(url);
    return qr;
  } catch (err) {
    console.log("QR error...", err);
  }
};

app.listen(5050, () => {
  console.log("IPFS server running on PORT: 5050");
});
