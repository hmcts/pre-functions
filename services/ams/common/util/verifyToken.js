const jwksClient = require("jwks-rsa");
const jwksuri = process.env.JWKSURI;
const jwt = require("jsonwebtoken");
const algo = process.env.ALGO;
const scope = process.env.SCOPE;
const issuer = process.env.ISSUER;
const azureTenantId = process.env.AZURE_TENANT_ID;
const azureClientId = process.env.AZURE_CLIENT_ID;

exports.verifyToken = async (accessToken) => {
    const decoded = jwt.decode(accessToken, { complete: true });
    const header = decoded.header;

    if (!header) throw Error("Authentication failed.  Invalid token");

    try {
        const verifyOptions = {
            algorithms: algo,
            issuer: issuer,
            aud: scope,
            subject: "",
        };

        const client = jwksClient({
            jwksUri: jwksuri,
        });

        const key = await client.getSigningKey(header.kid);
        let signingKey = key.getPublicKey();

        const payload = jwt.verify(
            accessToken,
            signingKey,
            verifyOptions,
            (err, verifiedToken) => {
                if (err) {
                    console.log(err);
                    return false;
                } else {
                    return (
                        // verifiedToken.aud === `api://${azureClientId}` &&
                        verifiedToken.appid === azureClientId &&
                        verifiedToken.tid === azureTenantId
                    );
                }
            }
        );
        return payload;
    } catch (err) {
        console.log(err);
        return false;
    }
};
