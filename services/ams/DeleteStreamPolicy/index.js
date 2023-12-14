const { AzureMediaServices } = require("@azure/arm-mediaservices");
const { DefaultAzureCredential } = require("@azure/identity");
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
const credential = new DefaultAzureCredential();
module.exports = async function deleteAStreamingPolicy(context, req) {
    const streamingPolicy = req.body.streamingPolicyName;
    if (!streamingPolicy)
        throw Error(
            "PLease provide a streaming policy name in the body of your request"
        );

    const client = new AzureMediaServices(credential, subscriptionId);

    try {
        const result = await client.streamingPolicies.delete(
            resourceGroup,
            accountName,
            streamingPolicy
        );
        context.res = {
            headers: { "Content-Type": "application/json" },
            body: result,
            status: 200,
        };
    } catch (err) {
        context.res = {
            headers: { "Content-Type": "application/json" },
            body: err,
            status: 400,
        };
    }
};
