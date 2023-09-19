const { AzureMediaServices } = require("@azure/arm-mediaservices");
const { DefaultAzureCredential } = require("@azure/identity");
const { verifyToken } = require("../common/util/verifyToken");
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
const streamingPolicyName = process.env.STREAMINGPOLICYNAME;

module.exports = async function createStreamingPolicy(context, req) {
    const accessToken = req.headers.authorization.split(" ")[1];
    if (!accessToken)
        throw Error("Authentication failed.  Invalid or missing token");
    let streamingPolicy = req.body.streamingPolicyName;
    if (!streamingPolicy) streamingPolicy = streamingPolicyName;
    const tokenValid = await verifyToken(accessToken);
    if (tokenValid) {
        const credential = new DefaultAzureCredential();

        const client = new AzureMediaServices(credential, subscriptionId);
        const parameters = {
            envelopeEncryption: {
                enabledProtocols: {
                    dash: true,
                    download: false,
                    hls: true,
                    smoothStreaming: true,
                },
            },
        };

        try {
            const result = await client.streamingPolicies.create(
                resourceGroup,
                accountName,
                streamingPolicy,
                parameters
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
    } else {
        context.res = {
            headers: { "Content-Type": "application/json" },
            body: "Authentication failed.  Invalid or missing token",
            status: 400,
        };
    }
};
