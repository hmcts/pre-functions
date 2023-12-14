const { AzureMediaServices } = require("@azure/arm-mediaservices");
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
const { DefaultAzureCredential } = require("@azure/identity");
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;

exports.checkAssetExists = async (filename) => {
    const credential = new DefaultAzureCredential();

    let mediaServicesClient = new AzureMediaServices(
        credential,
        subscriptionId
    );

    let assetList = [];

    // List assets in media account
    for await (const asset of mediaServicesClient.assets.list(
        resourceGroup,
        accountName
    )) {
        assetList.push(asset.name);
    }

    return assetList.length > 0 && assetList.some((item) => item === filename);
};
