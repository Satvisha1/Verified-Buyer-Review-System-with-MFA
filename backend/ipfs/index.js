const { uploadJSONToIPFS: uploadViaPinata } = require("./pinata");

async function uploadJSONToIPFS(jsonData) {
  return uploadViaPinata(jsonData);
}

module.exports = { uploadJSONToIPFS };