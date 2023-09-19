const {
    BlobServiceClient,
    generateAccountSASQueryParameters,
    AccountSASPermissions,
    AccountSASServices,
    AccountSASResourceTypes,
    StorageSharedKeyCredential,
    SASProtocol,
} = require("@azure/storage-blob");

const dotenv = require("dotenv");

dotenv.config();

const { verifyToken } = require("../common/util/verifyToken");
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
);

module.exports = async (context, req) => {
    const token = req.headers.authorization.split(" ")[1];
    const containerName = req.body.containerName;
    const fileName = req.body.filename;

    if (!containerName) throw Error("Azure Storage container not found");
    if (!fileName) throw Error("File not found");
    if (!token) throw Error("Authentication failed.  Invalid or missing token");

    const tokenValid = await verifyToken(token);

    if (tokenValid) {
        try {
            const sasToken = await createAccountSas();

            const sasUrlResponse = await useSasToken(
                sasToken,
                containerName,
                fileName
            );
            context.res = {
                headers: { "Content-Type": "application/json" },
                body: { sasUrl: sasUrlResponse },
                status: 200,
            };
        } catch (err) {
            context.res = {
                headers: { "Content-Type": "application/json" },
                body: err,
                status: 498,
            };
        }
    } else {
        context.res = {
            headers: { "Content-Type": "application/json" },
            body: "Authentication failed.  Invalid token",
            status: 498,
        };
    }
};

async function createAccountSas() {
    const sasOptions = {
        services: AccountSASServices.parse("btqf").toString(), // blobs, tables, queues, files
        resourceTypes: AccountSASResourceTypes.parse("cso").toString(), // service, container, object
        permissions: AccountSASPermissions.parse("rl"), // permissions
        protocol: SASProtocol.HttpsAndHttp,
        startsOn: new Date(),
        expiresOn: new Date(new Date().setDate(new Date().getDate() + 2560)), // 10 minutes
    };

    const sasToken = generateAccountSASQueryParameters(
        sasOptions,
        sharedKeyCredential
    ).toString();

    return sasToken[0] === "?" ? sasToken : `?${sasToken}`;
}

async function useSasToken(sasToken, containerName, fileName) {
    const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}?${sasToken}`,
        sharedKeyCredential
    );

    return blobServiceClient.url;
}
