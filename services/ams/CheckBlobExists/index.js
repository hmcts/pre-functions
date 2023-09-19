const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

const { verifyToken } = require("../common/util/verifyToken");

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    // Validate the request body
    if (!req.body || !req.body.containerName || !req.body.filePath || !req.body.accountName) {
        context.res = {
            status: 400,
            body: 'Please provide a container name, file path and storage account name in the request body.'
        };
        return;
    }

    if (!req.headers.authorization ||
        req.headers.authorization.indexOf('Bearer ') === -1 ||
        !verifyToken(req.headers.authorization.split(' ')[1])) {

        context.res = {
            status: 401,
            body: 'You must be authenticated to access this resource.'
        };
        return;
    }

    // Get the container name and file path from the request body
    const containerName = req.body.containerName;
    const filePath = req.body.filePath;
    const accountName = req.body.accountName;
    const accountKey = process.env[`${accountName.toUpperCase()}_KEY`]
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    // Validate the storage account credentials
    if (!accountName || !accountKey) {
        context.res = {
            status: 500,
            body: 'The storage account credentials are missing or invalid.'
        };
        return;
    }

    // Create a BlobServiceClient using the StorageSharedKeyCredential
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);

    try {
        // Get a reference to the container
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Check if the file exists
        const blobClient = containerClient.getBlobClient(filePath);
        const blobExists = await blobClient.exists();

        if (blobExists) {
            context.res = {
                status: 200,
                body: `The file ${filePath} exists in container ${containerName}.`
            };
        } else {
            context.res = {
                status: 404,
                body: `The file ${filePath} does not exist in container ${containerName}.`
            };
        }
    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: 'An error occurred while checking if the file exists.'
        };
    }
};
