const { BlobServiceClient, BlobClient } = require("@azure/storage-blob");
const { URLBuilder } = require("@azure/core-http");
const stream = require("stream");

function createBlobServiceClient(sasUrl) {
    return BlobServiceClient(sasUrl);
}

function createBlobServiceClientFromConnectionString(storageAccountName, atorageAccountKey) {
    return BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${atorageAccountKey};EndpointSuffix=core.windows.net`
    );
}

function createBlobClient(sasUrl) {
    return new BlobClient(sasUrl);
}

async function listStorageContainers(client) {
    let blobContainers = [];

    for await (const container of client.listContainers(
        {
            includeMetadata: false,
        },
    )
    ) {
        blobContainers.push(container.name);
    }

    return blobContainers;
}

async function getSasUrlForBlob(client, containerName, blobPath) {
    let sasUrl = client.url;
    let urlBuilder = new URLBuilder();
    urlBuilder.setPath(sasUrl);

    // Make sure to use encodeURIComponent here to remove ":" and other odd characters in the component path.
    // Or else the job HTTP Input will fail to work.
    urlBuilder.appendPath(encodeURIComponent(containerName));
    urlBuilder.appendPath(encodeURIComponent(blobPath));

    return urlBuilder.toString();
}

async function listBlobsInContainer(client, container, pageSize, extensions, continuationToken) {

    let containerClient = client.getContainerClient(container);

    let i = 0;
    let blobList = [];
    let blobMatches;
    let iterator;
    let response;

    if (continuationToken == '') {
        continuationToken = undefined;
    }

    try {
        iterator = containerClient.listBlobsFlat({ includeMetadata: true }).byPage({ maxPageSize: pageSize, continuationToken: continuationToken });
        response = (await iterator.next()).value;

        if (response.errorCode !== undefined) {
            throw (new Error(response.errorCode));
        }

        // Scan for blobs which match the extensions
        for (const blob of response.segment.blobItems) {

            // If this blob already has metadata saying it was encoded by AMS, skip it.
            if (blob.metadata && blob.metadata["ams_encoded"] == "true") {
                console.log(`Blob ${blob.name} already encoded by AMS, skipping.`);
                continue;
            }

            if (extensions !== undefined) {
                extensions.forEach(element => {
                    if (blob.name.indexOf(element) > -1) {
                        console.log(`Found blob ${blob.name} with extension:${element} in container:${container}`)
                        blobList.push(blob);
                        i++

                    }
                });
            }
        }

        blobMatches = {
            blobItems: blobList,
            matchCount: i,
            continuationToken: response.continuationToken,
            marker: response.marker,
            errorCode: response.errorCode
        }

        return blobMatches;

    } catch (err) {
        console.error("ERROR: in listBlobsInContainer - iterator.next()")
        console.error(err);
    }

    return;

}

async function createContainer(client, containerName) {
    const container = client.getContainerClient(containerName);
    if (!(await container.exists())) {
        await container.create();
    }
    return container;
}

async function uploadBlobStream(client, containerName, blobName, buffer, contentType) {
    const container = await createContainer(client, containerName);
    const blockBlobClient = container.getBlockBlobClient(blobName);
    const bufferStream = stream.PassThrough();
    bufferStream.end(buffer);
    await blockBlobClient.uploadStream(bufferStream, buffer.length, undefined, {
        blobHTTPHeaders: { blobContentType: contentType },
    });
}

async function deleteContainer(client, containerName) {
    const container = client.getContainerClient(containerName);
    if (await container.exists()) {
        await container.delete();
    }
}


module.exports = {
    createBlobServiceClient,
    createBlobServiceClientFromConnectionString,
    createBlobClient,
    listStorageContainers,
    getSasUrlForBlob,
    listBlobsInContainer,
    createContainer,
    uploadBlobStream,
    deleteContainer
}
