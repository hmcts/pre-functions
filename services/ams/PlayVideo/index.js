const { DefaultAzureCredential } = require("@azure/identity");
const { AzureMediaServices } = require("@azure/arm-mediaservices");
const { verifyToken } = require("../common/util/verifyToken");
const { checkAssetExists } = require("../common/util/checkAssetExists");
const Buffer = require("buffer").Buffer;
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
moment().format();

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const mediaServiceAccountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
const credential = new DefaultAzureCredential();
const audience = process.env.AUDIENCE;
const issuer = process.env.ISSUER;
const contentKeyPolicyName = process.env.CONTENTPOLICYKEYNAME;
const streamingPolicyName = process.env.STREAMINGPOLICYNAME;
const symmetricKey = process.env.SYMMETRICKEY;
let streamingLocatorTTL = 60
let streamingLocatorTTLEnv = parseInt(process.env.STREAMING_LOCATOR_TTL);
if (!isNaN(streamingLocatorTTLEnv) && streamingLocatorTTLEnv > 0 && streamingLocatorTTLEnv < 480) {
    streamingLocatorTTL = streamingLocatorTTLEnv;
}

let mediaServicesClient = new AzureMediaServices(credential, subscriptionId);

module.exports = async function (context, req) {
    const accessToken = req.headers.authorization.split(" ")[1];
    const filename = req.body.filename;
    let streamEndpoint = req.body.streamingEndpoint;
    if (!streamEndpoint) streamEndpoint = "default";
    if (!accessToken)
        throw Error("Authentication failed.  Invalid or missing token");
    if (!filename) throw Error("File not found");
    if (!accessToken)
        throw Error("Authentication failed.  Invalid or missing token");

  const tokenValid = await verifyToken(accessToken);

    if (tokenValid) {
        const assetExists = await checkAssetExists(filename);
        if (!assetExists) throw Error("Invalid or missing file");

        let tokenSigningKey = new Uint8Array(
            Buffer.from(symmetricKey, "base64")
        );

        try {
            let uniqueness = uuidv4();
            let locatorName = `${filename}-locator-${uniqueness}`;

            const streamingPolicyExists = await checkStreamingPolicyExists();

            if (!streamingPolicyExists) {
                await createStreamingPolicy();
            }

            let locator = await createStreamingLocator(filename, locatorName);

            let token = await getToken(issuer, audience, tokenSigningKey);

            if (locator.name !== undefined) {
                let url = await getStreamingUrl(
                    locator.name,
                    streamEndpoint,
                    token
                );
                context.res = {
                    headers: { "Content-Type": "application/json" },
                    body: url,
                    status: 200,
                };
            } else
                throw new Error(
                    "Locator was not created or Locator.name is undefined"
                );
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
            status: 401,
        };
    }
};

async function createStreamingPolicy() {
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

    const client = new AzureMediaServices(credential, subscriptionId);
    await client.streamingPolicies.create(
        resourceGroup,
        mediaServiceAccountName,
        streamingPolicyName,
        parameters
    );
}

async function createStreamingLocator(assetName, locatorName) {
    let expirationDateTime = new Date();
    expirationDateTime.setMinutes(expirationDateTime.getMinutes() + streamingLocatorTTL);

    let streamingLocator = {
        assetName,
        streamingPolicyName,
        defaultContentKeyPolicyName: contentKeyPolicyName,
        endTime: expirationDateTime,
    };

    let locator = await mediaServicesClient.streamingLocators.create(
        resourceGroup,
        mediaServiceAccountName,
        locatorName,
        streamingLocator
    );

    return locator;
}

async function getStreamingUrl(locatorName, streamEndpoint, token) {
    let streamingEndpoint = await mediaServicesClient.streamingEndpoints.get(
        resourceGroup,
        mediaServiceAccountName,
        streamEndpoint
    );

    let paths = await mediaServicesClient.streamingLocators.listPaths(
        resourceGroup,
        mediaServiceAccountName,
        locatorName
    );

    let streamingUrlEndpoint;
    if (paths.streamingPaths) {
        let path = paths.streamingPaths[0];

        let formatPath = path.paths ? path.paths[0] : "";

        if (formatPath) {
            let manifestPath = `https://${streamingEndpoint.hostName}${formatPath}`;
            streamingUrlEndpoint = {
                path: manifestPath,
                aes: true,
                aestoken: `Bearer%20${token}`,
                playUrl: `https://ampdemo.azureedge.net/?url=${manifestPath}&aes=true&aestoken=Bearer%20${token}`,
            };
        } else
            streamingUrlEndpoint = {
                statusCode: 404,
                msg: "Error: streaming path could not be found",
            };
    }

    return streamingUrlEndpoint;
}

async function getToken(issuer, audience, tokenSigningKey) {
    let startDate = moment().subtract(5, "minutes").unix();
    let endDate = moment().add(1, "day").unix();

    let claims = {
        // "userProfile" : "Admin", // This is a custom claim example. Use anything you want, but specify it first in the policy as required.
        // "urn:microsoft:azure:mediaservices:maxuses": 2 // optional feature for token replay prevention built into AMS
        exp: endDate,
        nbf: startDate,
    };

    let jwtToken = jwt.sign(claims, Buffer.from(tokenSigningKey), {
        algorithm: "HS256",
        issuer: issuer,
        audience,
    });

    return jwtToken;
}

async function checkStreamingPolicyExists() {
    let streamingPoliciesList = [];

    for await (const policy of mediaServicesClient.streamingPolicies.list(
        resourceGroup,
        mediaServiceAccountName
    )) {
        streamingPoliciesList.push(policy.name);
    }

    return (
        streamingPoliciesList.length > 0 &&
        streamingPoliciesList.some((item) => item === streamingPolicyName)
    );
}
