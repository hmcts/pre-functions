const { DefaultAzureCredential } = require("@azure/identity");
const { AzureMediaServices, KnownOnErrorType, KnownPriority } = require("@azure/arm-mediaservices");
const factory = require("../common/encoding/transformFactory");
const jobHelper = require("../common/encoding/encodingJobHelpers");
const { v4: uuidv4 } = require('uuid');
const { handleFunctionError, throwBadRequestError } = require("../common/util/errors");

const {
    AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_SUBSCRIPTION_ID,
    AZURE_RESOURCE_GROUP,
    AZURE_MEDIA_SERVICES_ACCOUNT_NAME,
} = process.env;

// const credential = new ManagedIdentityCredential("<USER_ASSIGNED_MANAGED_IDENTITY_CLIENT_ID>");
const transformName = "CopyCodec";


module.exports = async function main(context, req) {
    try {
        const response = await generateAMSAsset(context, req);
        context.res = {
            status: 200,
            body: response
        };
        return;
    } catch (error) {
        context.res = handleFunctionError(context, req, "GenerateAMSAsset", error);
        return;
    }
}


async function generateAMSAsset(context, req) {
    const { sourceContainer, destinationContainer, tempAsset, finalAsset, description } = req.body;

    if (!sourceContainer || !destinationContainer || !tempAsset || !finalAsset || !description) {
        throwBadRequestError("Please pass the sourceContainer, destinationContainer, tempAsset, finalAsset and description in the request body");
    }

    const credential = new DefaultAzureCredential();
    let mediaServicesClient = new AzureMediaServices(credential, AZURE_SUBSCRIPTION_ID);

    jobHelper.setMediaServicesClient(mediaServicesClient);
    jobHelper.setAccountName(AZURE_MEDIA_SERVICES_ACCOUNT_NAME);
    jobHelper.setResourceGroup(AZURE_RESOURCE_GROUP);

    context.log(`Creating Standard Encoding transform named: ${transformName}`);

    let transformOutput = [{
        preset: factory.createBuiltInStandardEncoderPreset({
            presetName: "saasCopyCodec"
        }),

        onError: KnownOnErrorType.StopProcessingJob,
        relativePriority: KnownPriority.Normal
    }];

    context.log("Creating encoding transform...");

    let transform = {
        name: transformName,
        description: "Copies the source audio and video to an MP4 file.",
        outputs: transformOutput
    }

    await mediaServicesClient.transforms.createOrUpdate(AZURE_RESOURCE_GROUP, AZURE_MEDIA_SERVICES_ACCOUNT_NAME, transformName, transform)
        .then((transform) => {
            context.log(`Transform ${transform.name} created (or updated if it existed already).`);
        })
        .catch((reason) => {
            context.log(`There was an error creating the transform. ${reason}`)
            throw(reason)
        });

    let jobName = `${tempAsset}-job-${uuidv4()}`;

    context.log("Creating the output Asset (container) to encode the content into...");

    await mediaServicesClient.assets.createOrUpdate(
        AZURE_RESOURCE_GROUP,
        AZURE_MEDIA_SERVICES_ACCOUNT_NAME,
        tempAsset,
        {
            storageAccountName: AZURE_STORAGE_ACCOUNT_NAME,
            container: sourceContainer,
            description: description,
        }
    );

    await mediaServicesClient.assets.createOrUpdate(
        AZURE_RESOURCE_GROUP,
        AZURE_MEDIA_SERVICES_ACCOUNT_NAME,
        finalAsset,
        {
            storageAccountName: AZURE_STORAGE_ACCOUNT_NAME,
            container: destinationContainer,
            description: description,
        }
    );

    let input = factory.createJobInputAsset({
        assetName: tempAsset,
    })

    context.log(`Submitting the encoding job to the ${transformName} job queue...`);

    let job = await jobHelper.submitJob(transformName, jobName, input, finalAsset);

    context.log(`Waiting for encoding Job - ${job.name} - to finish...`);
    job = await jobHelper.waitForJobToFinish(transformName, jobName);

    // Clean up - (can't be done as containers are immutable)
    // context.log("Cleaning up...");
    // await storage.deleteContainer(storageClient, sourceContainer);
    // await mediaServicesClient.assets.delete(AZURE_RESOURCE_GROUP, AZURE_MEDIA_SERVICES_ACCOUNT_NAME, tempAsset);

    // Todo: Upload VTT to output container and attach to AMS asset

    return {
        asset: finalAsset,
        container: destinationContainer,
        description: description,
        jobStatus: job.status,
    };
}
