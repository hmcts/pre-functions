module.exports = async function (context, eventGridEvent) {
    context.log('Received event:', JSON.stringify(eventGridEvent));

    // Get the asset name from the event payload
    const assetName = eventGridEvent.data.assetName;

    // Get a reference to the Blob Storage account
    const storageAccountConnectionString = process.env['AzureWebJobsStorage'];
    const blobServiceClient = require('@azure/storage-blob').BlobServiceClient.fromConnectionString(storageAccountConnectionString);

    // Get a reference to the container that holds the CSV files
    const containerName = 'csv-container';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Get a reference to the CSV file with the provided asset name
    const blobName = `${assetName}.csv`;
    const blobClient = containerClient.getBlobClient(blobName);

    // Download the CSV file as a string
    const downloadResponse = await blobClient.download();
    const csvString = (await streamToBuffer(downloadResponse.readableStreamBody)).toString();

    const lines = csvString.split('\n').splice(1);

    const events = lines.map(line => line.split(',').splice(0, 2))
        .filter(event => event[0] === 'Microsoft.Media.LiveEventIncomingStreamReceived' || event[0] === 'Microsoft.Media.LiveEventEncoderDisconnected')
        .filter((event, index, self) => {
            const previousEvent = self[index - 1];
            if (previousEvent) {
                return event[0] !== previousEvent[0] || event[1] !== previousEvent[1];
            }
            return true;
        })
        .map(event => {
            const [day, month, year, hours, minutes, seconds] = event[1].split(/[/ :]/);
            return new Date(`${month}/${day}/${year} ${hours}:${minutes}:${seconds}`);
        });

    let timestamps = [];
    for (let i = 0; i < events.length; i += 2) {
        const duration = ((events[i + 1] - events[i]) / 1000) + 1;
        for (let j = 0; j < duration; j++) {
            timestamps.push(new Date(events[i].getTime() + j * 1000));
        }
    }

    let vtt = `WEBVTT - ${assetName}

STYLE
::cue {
    color: white;
    background-color: black;
    background-opacity: 1;
    font-size: 1.5rem;
    font-family: monospace;
}\n\n`;

    for (let i = 0; i < timestamps.length; i++) {
        vtt += `${formatSeconds(i)} --> ${formatSeconds(i + 1)} align:end line:100%
${formatDate(timestamps[i])}\n\n`;
    }

    // Upload the first vtt file to Blob Storage
    const vttBlobName = `${assetName}.vtt`;
    const vttBlobClient = containerClient.getBlobClient(vttBlobName);
    const uploadResponse = await vttBlobClient.upload(firstTwoLines, firstTwoLines.length);
    context.log(`Uploaded ${vttBlobName} with status ${uploadResponse._response.status}`);

    context.res = { body: 'OK' };
};

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

function formatSeconds(seconds) {
    const date = new Date(seconds * 1000);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secondsStr = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secondsStr}.${milliseconds}`;
}

function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().substr(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
