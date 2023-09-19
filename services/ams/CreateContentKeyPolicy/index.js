const { AzureMediaServices } = require("@azure/arm-mediaservices");
const { DefaultAzureCredential } = require("@azure/identity");
const Buffer = require("buffer").Buffer;
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
const contentKeyPolicyName = process.env.CONTENTPOLICYKEYNAME;
const audience = process.env.AUDIENCE;
const { verifyToken } = require("../common/util/verifyToken");
const issuer = process.env.ISSUER;
const symmetricKey = process.env.SYMMETRICKEY;

module.exports = async function createOrUpdateContentKeyPolicy(context, req) {
    const accessToken = req.headers.authorization.split(" ")[1];
    if (!accessToken)
        throw Error("Authentication failed.  Invalid or missing token");
    let contentKeyPolicy = req.body.contentKeyPolicyName;
    if (!contentKeyPolicy) contentKeyPolicy = contentKeyPolicyName;
    const tokenValid = await verifyToken(accessToken);

    if (tokenValid) {
        // This is an constant secret when moving to a production system and should be kept in a Key Vault.
        let tokenSigningKey = new Uint8Array(
            Buffer.from(symmetricKey, "base64")
        );

        const parameters = {
            description: "PRE Content Key Policy",
            options: [
                {
                    name: "ClearKeyOption",
                    configuration: {
                        odataType:
                            "#Microsoft.Media.ContentKeyPolicyClearKeyConfiguration",
                    },
                    restriction: {
                        odataType:
                            "#Microsoft.Media.ContentKeyPolicyTokenRestriction",
                        audience,
                        issuer,
                        primaryVerificationKey: {
                            odataType:
                                "#Microsoft.Media.ContentKeyPolicySymmetricTokenKey",
                            keyValue: tokenSigningKey,
                        },
                        restrictionTokenType: "Jwt",
                    },
                },
            ],
        };
        const credential = new DefaultAzureCredential();
        const client = new AzureMediaServices(credential, subscriptionId);

        try {
            const result = await client.contentKeyPolicies.createOrUpdate(
                resourceGroup,
                accountName,
                contentKeyPolicy,
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
            body: "Authentication failed.  Invalid token",
            status: 498,
        };
    }
};
