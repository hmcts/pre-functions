const factory = require("../encoding/transformFactory");
const { createBlobClient } = require("../storage/blobStorage");
const { BlobServiceClient, AnonymousCredential, Metadata, BlobItem } = require("@azure/storage-blob");
const { AbortController } = require("@azure/abort-controller");
const path = require("path");
const url = require('whatwg-url');
const util = require('util');
const fs = require('fs');
const { URLBuilder } = require("@azure/core-http");


let mediaServicesClient;
let accountName;
let resourceGroup;
let remoteStorageSas;


function setMediaServicesClient(client) {
    mediaServicesClient = client;
}

function setAccountName(account) {
    accountName = account;
}

function setResourceGroup(groupName) {
    resourceGroup = groupName
}

function setRemoteStorageSas(remoteSasUrl) {
    remoteStorageSas = remoteSasUrl;
}

async function submitJob(transformName, jobName, jobInput, outputAssetName, correlationData, presetOverride) {
    if (outputAssetName == undefined) {
        throw new Error("OutputAsset Name is not defined. Check creation of the output asset");
    }

    let jobOutputs = [
        factory.createJobOutputAsset({
            assetName: outputAssetName,
            presetOverride: presetOverride
        })
    ];

    return await mediaServicesClient.jobs.create(resourceGroup, accountName, transformName, jobName, {
        input: jobInput,
        outputs: jobOutputs,
        // Pass in custom correlation data to match up to your customer tenants, or any custom job tracking information you wish to log in the event grid events
        correlationData: correlationData,

    },);

}

async function submitJobMultiOutputs(transformName, jobName, jobInput, jobOutputs, correlationData) {

    return await mediaServicesClient.jobs.create(resourceGroup, accountName, transformName, jobName, {
        input: jobInput,
        outputs: jobOutputs,
        // Pass in custom correlation data to match up to your customer tenants, or any custom job tracking information you wish to log in the event grid events
        correlationData: correlationData,

    });

}

async function submitJobMultiInputs(transformName, jobName, jobInputs, outputAssetName, correlationData, presetOverride) {
    if (outputAssetName == undefined) {
        throw new Error("OutputAsset Name is not defined. Check creation of the output asset");
    }
    let jobOutputs = [
        factory.createJobOutputAsset({
            assetName: outputAssetName,
            presetOverride: presetOverride
        })
    ];

    return await mediaServicesClient.jobs.create(resourceGroup, accountName, transformName, jobName, {
        input: factory.createJobInputs({
            inputs: jobInputs
        }),
        outputs: jobOutputs,
        // Pass in custom correlation data to match up to your customer tenants, or any custom job tracking information you wish to log in the event grid events
        correlationData: correlationData,

    });

}

async function submitJobWithInputSequence(transformName, jobName, inputSequence, outputAssetName) {
    if (outputAssetName === undefined) {
        throw new Error("OutputAsset Name is not defined. Check creation of the output asset");
    }

    let jobOutputs = [
        factory.createJobOutputAsset({
            assetName: outputAssetName
        })
    ];


    return await mediaServicesClient.jobs.create(resourceGroup, accountName, transformName, jobName, {
        input: inputSequence,
        outputs: jobOutputs
    });

}

async function submitJobWithTrackDefinitions(transformName, jobName, jobInput, outputAssetName, inputDefinitions) {
    if (outputAssetName == undefined) {
        throw new Error("OutputAsset Name is not defined. Check creation of the output asset");
    }

    let jobInputWithTrackDefinitions = jobInput;
    jobInputWithTrackDefinitions.inputDefinitions = inputDefinitions;

    let jobOutputs = [
        factory.createJobOutputAsset({
            assetName: outputAssetName
        })
    ];

    return await mediaServicesClient.jobs.create(resourceGroup, accountName, transformName, jobName, {
        input: jobInputWithTrackDefinitions,
        outputs: jobOutputs
    });

}

// Creates a new Media Services Asset, which is a pointer to a storage container
// Uses the Storage Blob npm package to upload a local file into the container through the use
// of the SAS URL obtained from the new Asset object.
// This demonstrates how to upload local files up to the container without require additional storage credential.
async function createInputAsset(assetName, fileToUpload) {
    let uploadSasUrl;
    let fileName;
    let sasUri;

    let asset = await mediaServicesClient.assets.createOrUpdate(resourceGroup, accountName, assetName, {});
    let date = new Date();
    let readWritePermission = "ReadWrite";

    date.setHours(date.getHours() + 1);
    let input = {
        permissions: readWritePermission,
        expiryTime: date
    }

    let listContainerSas = await mediaServicesClient.assets.listContainerSas(resourceGroup, accountName, assetName, input);
    if (listContainerSas.assetContainerSasUrls) {
        uploadSasUrl = listContainerSas.assetContainerSasUrls[0];
        fileName = path.basename(fileToUpload);
        sasUri = url.parseURL(uploadSasUrl);

        // Get the Blob service client using the Asset's SAS URL and the Anonymous credential method on the Blob service client
        const anonymousCredential = new AnonymousCredential();
        let blobClient = new BlobServiceClient(uploadSasUrl, anonymousCredential)
        // We need to get the containerName here from the SAS URL path to use later when creating the container client
        let containerName = sasUri?.path[0];
        console.log(`Uploading file named ${fileName} to blob in the Asset's container...`);

        // Get the blob container client using the empty string to use the same container as the SAS URL points to.
        // Otherwise, adding a name here creates a sub folder, which will break the analysis.
        let containerClient = blobClient.getContainerClient('');
        // Next gets the blockBlobClient needed to use the uploadFile method
        let blockBlobClient = containerClient.getBlockBlobClient(fileName);

        // Parallel uploading with BlockBlobClient.uploadFile() in Node.js runtime
        // BlockBlobClient.uploadFile() is only available in Node.js and not in Browser
        await blockBlobClient.uploadFile(fileToUpload, {
            blockSize: 4 * 1024 * 1024, // 4MB Block size
            concurrency: 20, // 20 concurrent
            onProgress: (ev) => console.log(ev)
        });

    }

    return asset;
}

async function waitForJobToFinish(transformName, jobName) {
    let timeout = new Date();
    // Timer values
    const timeoutSeconds = 60 * 10;
    const sleepInterval = 1000 * 2;
    const setTimeoutPromise = util.promisify(setTimeout);

    timeout.setSeconds(timeout.getSeconds() + timeoutSeconds);


    async function pollForJobStatus() {
        let job = await mediaServicesClient.jobs.get(resourceGroup, accountName, transformName, jobName);

        // Note that you can report the progress for each Job output if you have more than one. In this case, we only have one output in the Transform
        // that we defined in this sample, so we can check that with the job.outputs[0].progress parameter.
        if (job.outputs != undefined) {
            console.log(`Job State is : ${job.state},  Progress: ${job.outputs[0].progress}%`);
        }

        if (job.state == 'Finished' || job.state == 'Error' || job.state == 'Canceled') {

            return job;
        } else if (new Date() > timeout) {
            console.log(`Job ${job.name} timed out. Please retry or check the source file.`);
            return job;
        } else {

            await setTimeoutPromise(sleepInterval, null);
            return pollForJobStatus();
        }
    }

    return await pollForJobStatus();
}

async function waitForAllJobsToFinish(transformName, jobQueue, currentContainer, batchCounter) {

    const sleepInterval = 1000 * 10;
    const setTimeoutPromise = util.promisify(setTimeout);

    let batchProcessing = true

    while (batchProcessing) {
        let errorCount = 0;
        let finishedCount = 0;
        let processingCount = 0;
        let outputRows = [];

        for await (const jobItem of jobQueue) {
            if (jobItem.name !== undefined) {
                let job = await mediaServicesClient.jobs.get(resourceGroup, accountName, transformName, jobItem.name);

                if (job.outputs != undefined) {
                    outputRows.push(
                        {
                            Start: (job.startTime === undefined) ? "starting" : job.startTime.toLocaleTimeString('en-US', { hour12: false }),
                            Job: job.name,
                            State: job.state,
                            Progress: job.outputs[0].progress,
                            End: (job.endTime === undefined) ? "---" : job.endTime?.toLocaleTimeString('en-US', { hour12: false })
                        });
                }
                if (job.state == 'Error' || job.state == 'Canceled') {
                    if (job.input) {
                        updateJobInputMetadata(job.input, { "ams_encoded": "false", "ams_status": job.state });
                    }
                    errorCount++;
                }
                else if (job.state == 'Finished') {
                    // Update the source blob metadata to note that we encoded it already, the date it was encoded, and the transform name used
                    if (job.input) {
                        updateJobInputMetadata(job.input,
                            {
                                "ams_encoded": "true",
                                "ams_status": job.state,
                                "ams_encodedDate": new Date().toUTCString(),
                                "ams_transform": transformName
                            });
                    }
                    finishedCount++;
                }
                else if (job.state == 'Processing' || job.state == 'Scheduled') {
                    processingCount++;
                }
            }
        }

        console.log(`\n----------------------------------------\tENCODING BATCH  #${batchCounter}       ----------------------------------------------------`);
        console.log(`Current Container: ${currentContainer}`)
        console.log(`Encoding batch size: ${jobQueue.length}\t Processing: ${processingCount}\t Finished: ${finishedCount}\t Error:${errorCount} `)
        console.log(`-------------------------------------------------------------------------------------------------------------------------------`);
        console.table(outputRows);


        // If the count of finished and errored jobs add up to the length of the queue batch, then break out.
        if (finishedCount + errorCount == jobQueue.length) {
            batchProcessing = false;
        }

        await setTimeoutPromise(sleepInterval);
    }
}

async function updateJobInputMetadata(jobInput, metadata) {

    if (jobInput) {
        let input = jobInput;
        if (input.files) {

            let sasUri = URLBuilder.parse(remoteStorageSas);
            let sasQuery = sasUri.getQuery()?.toString();
            let blobUri = URLBuilder.parse(input.files[0]);
            blobUri.setQuery(sasQuery);

            // This sample assumes that the input files URL [0] is a SAS URL.
            // Get the Blob service client using the Asset's SAS URL and the Anonymous credential method on the Blob service client
            let blobClient = createBlobClient(blobUri.toString()); // at this point we are assuming this is a SAS URL and not just any HTTPS URL.


            try {
                await blobClient.setMetadata(metadata);
            } catch (error) {
                console.error(`Error updating the metadata on the JobInput.  Please check to make sure that the source SAS URL allows writes to update metadata`);
                // console.log (error);
            }

        }
    }
}

async function downloadResults(assetName, resultsFolder) {
    let date = new Date();
    let readPermission = "Read";

    date.setHours(date.getHours() + 1);
    let input = {
        permissions: readPermission,
        expiryTime: date
    }
    let listContainerSas = await mediaServicesClient.assets.listContainerSas(resourceGroup, accountName, assetName, input);

    if (listContainerSas.assetContainerSasUrls) {
        let containerSasUrl = listContainerSas.assetContainerSasUrls[0];
        let sasUri = url.parseURL(containerSasUrl);

        // Get the Blob service client using the Asset's SAS URL and the Anonymous credential method on the Blob service client
        const anonymousCredential = new AnonymousCredential();
        let blobClient = new BlobServiceClient(containerSasUrl, anonymousCredential)
        // We need to get the containerName here from the SAS URL path to use later when creating the container client
        let containerName = sasUri?.path[0];
        let directory = path.join(resultsFolder, assetName);
        console.log(`Downloading output into ${directory}`);

        // Get the blob container client using the container name on the SAS URL path
        // to access the blockBlobClient needed to use the uploadFile method
        let containerClient = blobClient.getContainerClient('');

        try {
            fs.mkdirSync(directory, { recursive: true });
        } catch (err) {
            // directory exists
            // console.log(err);
        }
        console.log(`Listing blobs in container ${containerName}...`);
        console.log("Downloading blobs to local directory in background...");
        let i = 1;
        for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
            console.log(`Blob ${i++}: ${blob.name}`);

            let blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            await blockBlobClient.downloadToFile(path.join(directory, blob.name), 0, undefined,
                {
                    abortSignal: AbortController.timeout(30 * 60 * 1000),
                    maxRetryRequests: 2,
                    onProgress: (ev) => console.log(ev)
                }).then(() => {
                    console.log(`Download file complete`);
                });

        }
    }
}

// Selects the JobInput type to use based on the value of inputFile or inputUrl.
// Set inputFile to null to create a Job input that sources from an HTTP URL path
// Creates a new input Asset and uploads the local file to it before returning a JobInputAsset object
// Returns a JobInputHttp object if inputFile is set to null, and the inputUrl is set to a valid URL
async function getJobInputType(inputFile, inputUrl, assetName) {
    if (inputFile !== undefined) {
        await createInputAsset(assetName, inputFile);
        return factory.createJobInputAsset({
            assetName: assetName
        })
    } else {
        return factory.createJobInputHttp({
            files: [inputUrl]
        })
    }
}


async function createStreamingLocator(assetName, locatorName) {
    let streamingLocator = {
        assetName: assetName,
        streamingPolicyName: "Predefined_ClearStreamingOnly"  // no DRM or AES128 encryption protection on this asset. Clear means not encrypted.
    };

    return await mediaServicesClient.streamingLocators.create(
        resourceGroup,
        accountName,
        locatorName,
        streamingLocator);
}


async function getStreamingUrls(locatorName) {
    // Make sure the streaming endpoint is in the "Running" state on your account
    let streamingEndpoint = await mediaServicesClient.streamingEndpoints.get(resourceGroup, accountName, "default");

    let paths = await mediaServicesClient.streamingLocators.listPaths(resourceGroup, accountName, locatorName);
    if (paths.streamingPaths) {
        paths.streamingPaths.forEach(path => {
            path.paths?.forEach(formatPath => {
                let manifestPath = "https://" + streamingEndpoint.hostName + formatPath
                console.log(manifestPath);
                console.log(`Click to playback in AMP player: http://ampdemo.azureedge.net/?url=${manifestPath}`)
            });
        });
    }
}


// This method builds the manifest URL from the static values used during creation of the Live Output.
// This allows you to have a deterministic manifest path. <streaming endpoint hostname>/<streaming locator ID>/manifestName.ism/manifest(<format string>)
async function buildManifestPaths(streamingLocatorId, manifestName, filterName, streamingEndpointName) {
    const hlsFormat = "format=m3u8-cmaf";
    const dashFormat = "format=mpd-time-cmaf";

    // Get the default streaming endpoint on the account
    let streamingEndpoint = await mediaServicesClient.streamingEndpoints.get(resourceGroup, accountName, streamingEndpointName);

    if (streamingEndpoint?.resourceState !== "Running") {
        console.log(`Streaming endpoint is stopped. Starting the endpoint named ${streamingEndpointName}`);
        await mediaServicesClient.streamingEndpoints.beginStartAndWait(resourceGroup, accountName, streamingEndpointName, {

        })
            .then(() => {
                console.log("Streaming Endpoint Started.");
            })

    }

    let manifestBase = `https://${streamingEndpoint.hostName}/${streamingLocatorId}/${manifestName}.ism/manifest`

    let hlsManifest;

    if (filterName === undefined) {
        hlsManifest = `${manifestBase}(${hlsFormat})`;
    } else {
        hlsManifest = `${manifestBase}(${hlsFormat},filter=${filterName})`;
    }
    console.log(`The HLS (MP4) manifest URL is : ${hlsManifest}`);
    console.log("Open the following URL to playback the live stream in an HLS compliant player (HLS.js, Shaka, ExoPlayer) or directly in an iOS device");
    console.log(`${hlsManifest}`);
    console.log();

    let dashManifest;
    if (filterName === undefined) {
        dashManifest = `${manifestBase}(${dashFormat})`;
    } else {
        dashManifest = `${manifestBase}(${dashFormat},filter=${filterName})`;
    }

    console.log(`The DASH manifest URL is : ${dashManifest}`);
    console.log("Open the following URL to playback the live stream from the LiveOutput in the Azure Media Player");
    console.log(`https://ampdemo.azureedge.net/?url=${dashManifest}&heuristicprofile=lowlatency`);
    console.log();
}

async function moveOutputAssetToSas(assetName, sasUrl, sourceFilePath, noCopyExtensionFilters, deleteAssetsOnCopy) {
    let date = new Date();
    let readWritePermission = "ReadWrite";
    let baseFileName = "";

    try {

        date.setHours(date.getHours() + 1);
        let listSasInput = {
            permissions: readWritePermission,
            expiryTime: date
        }

        let listContainerSas = await mediaServicesClient.assets.listContainerSas(resourceGroup, accountName, assetName, listSasInput);
        if (listContainerSas.assetContainerSasUrls) {
            let assetContainerSas = listContainerSas.assetContainerSasUrls[0];

            // Get the Blob service client using the Asset's SAS URL and the Anonymous credential method on the Blob service client
            const anonymousCredential = new AnonymousCredential();
            // Get a Blob client for the source asset container and the provided destination container in the remote storage location
            let sourceBlobClient = new BlobServiceClient(assetContainerSas, anonymousCredential);
            let destinationBlobClient = new BlobServiceClient(sasUrl, anonymousCredential);

            console.log(`Moving output from ${assetName}`);

            // Get the blob container client using the empty string to use the same container as the SAS URL points to.
            // Otherwise, adding a name here creates a sub folder
            let sourceContainerClient = sourceBlobClient.getContainerClient('');
            let destinationContainerClient = destinationBlobClient.getContainerClient('');

            let blobs = await sourceContainerClient.listBlobsFlat({ includeCopy: true, includeUncommitedBlobs: true });

            let blobItemsFiltered = [];

            // First we loop through the asset blobs and do our business logic
            // We want to filter out the unwanted blobs, and also store the base file name to use
            // when renaming the default Content Aware Encoding preset Thumbnail if it exists.
            for await (const blob of blobs) {
                // This will grab the GUID on the metadata file and use it for the Thumbnail file name if that exists.
                // This is mostly a workaround to deal with the fact that the CAE preset outputs the same Thumbnail000001.jpg name for every encode

                if (blob.name.indexOf('_manifest') > -1) {
                    baseFileName = blob.name.split("_manifest")[0];
                }

                let skipCopy = false;
                // if the blob is on the no copy list, skip it...don't copy to output
                for (const noCopyExtension of noCopyExtensionFilters) {
                    if (blob.name.endsWith(noCopyExtension)) {
                        skipCopy = true;
                    }
                }

                if (skipCopy) {
                    continue;
                }

                blobItemsFiltered.push(blob);
            };


            for await (const blob of blobItemsFiltered) {

                //let blockBlobClient = sourceContainerClient.getBlockBlobClient(blob.name);
                // Lease the blob to prevent anyone else using it... throwing exception here -  UnhandledPromiseRejectionWarning: Unhandled promise rejection
                //let lease = sourceContainerClient.getBlobLeaseClient(blob.name).acquireLease(60);
                //console.log ("Lease state:", (await blockBlobClient.getProperties()).leaseState);

                // Create a destination Block Blob with the same name, unless the outputFolder is set to preserve the source hierarchy.
                let destinationBlobName;
                let blobCopyName;

                // Special case to rename the CAE preset default thumbnail, which cannot be changed in the preset transform settings.
                // This will use the GUID from the metadata file as the prefix name instead
                if (blob.name.indexOf("Thumbnail000001") > -1 && baseFileName !== "") {
                    blobCopyName = baseFileName + "_thumbnail000001.jpg";
                } else {
                    blobCopyName = blob.name;
                }

                if (sourceFilePath) {
                    destinationBlobName = `${sourceFilePath}/${blobCopyName}`;

                } else {
                    destinationBlobName = blobCopyName;
                }

                let destinationBlob = destinationContainerClient.getBlockBlobClient(destinationBlobName);

                let sasUrlBuilder = URLBuilder.parse(assetContainerSas);
                sasUrlBuilder.appendPath(blob.name);

                // Copy the source into the destinationBlob and poll until done
                const copyPoller = await destinationBlob.beginCopyFromURL(sasUrlBuilder.toString())
                const result = await copyPoller.pollUntilDone();

                if (result.errorCode) {
                    console.log(`ERROR copying the blob ${blob.name} in asset ${assetName}`)
                } else {
                    console.log(`${date.toLocaleTimeString(undefined, { hour12: false })} FINISHED copying blob ${destinationBlobName} from asset ${assetName} to destination`)
                }
            }

            // Once all are copied, we delete the source asset if set to true.
            if (deleteAssetsOnCopy) {
                // Delete the source Asset here.
                await mediaServicesClient.assets.delete(resourceGroup, accountName, assetName);
                console.log(`${date.toLocaleTimeString(undefined, { hour12: false })} DELETED the source asset:${assetName}`);
            }
        }

    } catch (err) {
        console.log(err);
    }

}

module.exports = {
    setMediaServicesClient,
    setResourceGroup,
    setAccountName,
    setRemoteStorageSas,
    submitJob,
    submitJobMultiInputs,
    submitJobMultiOutputs,
    submitJobWithInputSequence,
    submitJobWithTrackDefinitions,
    waitForJobToFinish,
    waitForAllJobsToFinish,
    updateJobInputMetadata,
    downloadResults,
    getJobInputType,
    createStreamingLocator,
    getStreamingUrls,
    buildManifestPaths,
    moveOutputAssetToSas
}
