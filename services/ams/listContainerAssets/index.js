const {
    StorageSharedKeyCredential,
    BlobServiceClient,
} = require("@azure/storage-blob");

const { verifyToken } = require("../common/util/verifyToken");
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

// Create credential
const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
);

module.exports = async (context, req) => {
    const accessToken = req.headers.authorization.split(" ")[1];
    const containerName = req.body.containerName;

    if (!containerName) throw Error("Azure Storage container not found");
    if (!accessToken)
        throw Error("Authentication failed.  Invalid or missing token");

    const tokenValid = verifyToken(accessToken);

    if (tokenValid) {
        try {
            const baseUrl = `https://${accountName}.blob.core.windows.net/`;

            const blobServiceClient = new BlobServiceClient(
                `${baseUrl}`,
                sharedKeyCredential
            );

            // Create container client
            const containerClient =
                blobServiceClient.getContainerClient(containerName);

            let blobsList = [];

            // List blobs in container
            for await (const blob of containerClient.listBlobsFlat()) {
                blobsList.push(blob.name);
            }

            context.res = {
                headers: { "Content-Type": "application/json" },
                body: { blobsList: blobsList },
                status: 200,
            };
        } catch (err) {
            context.res = {
                headers: { "Content-Type": "application/json" },
                body: err,
                status: 498,
            };
            throw err;
        }
    } else {
        throw Error("Authentication failed.  Invalid token");
    }
};
