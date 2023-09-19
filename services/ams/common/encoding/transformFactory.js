function createCopyVideo(video) {
    return {
        odataType: "#Microsoft.Media.CopyVideo",
        ...video,
    };
}

function createCopyAudio(audio) {
    return {
        odataType: "#Microsoft.Media.CopyAudio",
        ...audio,
    };
}

function createH264Video(video) {
    return {
        odataType: "#Microsoft.Media.H264Video",
        ...video,
    };
}

function createH264Layer(layer) {
    return {
        //odataType: "#Microsoft.Media.H264Layer",
        ...layer,
    };
}

function createH265Video(video) {
    return {
        odataType: "#Microsoft.Media.H265Video",
        ...video,
    };
}

function createH265Layer(layer) {
    return {
        //odataType: "#Microsoft.Media.H265Layer",
        ...layer,
    };
}

function createAACaudio(audio) {
    return {
        odataType: "#Microsoft.Media.AacAudio",
        ...audio,
    };
}

function createPngImage(image) {
    return {
        odataType: "#Microsoft.Media.PngImage",
        ...image,
    };
}

function createPngLayer(image) {
    return {
        //odataType: "#Microsoft.Media.PngLayer",
        ...image,
    };
}

function createPngFormat(pngFormat) {
    return {
        odataType: "#Microsoft.Media.PngFormat",
        ...pngFormat,
    };
}

function createJpgImage(image) {
    return {
        odataType: "#Microsoft.Media.JpgImage",
        ...image,
    };
}

function createJpgLayer(image) {
    return {
        //odataType: "#Microsoft.Media.JpgLayer",
        ...image,
    };
}

function createJpgFormat(format) {
    return {
        odataType: "#Microsoft.Media.JpgFormat",
        ...format,
    };
}

function createStandardEncoderPreset(standardEncoder) {
    return {
        odataType: "#Microsoft.Media.StandardEncoderPreset",
        ...standardEncoder,
    };
}

function createBuiltInStandardEncoderPreset(builtInStandardEncoder) {
    return {
        odataType: "#Microsoft.Media.BuiltInStandardEncoderPreset",
        ...builtInStandardEncoder,
    };
}

function createAudioAnalyzerPreset(audioAnalyserPreset) {
    return {
        odataType: "#Microsoft.Media.AudioAnalyzerPreset",
        ...audioAnalyserPreset,
    };
}

function createVideoAnalyzerPreset(videoAnalyserPreset) {
    return {
        odataType: "#Microsoft.Media.VideoAnalyzerPreset",
        ...videoAnalyserPreset,
    };
}

function createMp4Format(mp4Format) {
    return {
        odataType: "#Microsoft.Media.Mp4Format",
        ...mp4Format,
    };
}

function createTSFormat(tsFormat) {
    return {
        odataType: "#Microsoft.Media.TransportStreamFormat",
        ...tsFormat,
    };
}

function createSelectAudioTrackById(audioTrackById) {
    return {
        odataType: "#Microsoft.Media.SelectAudioTrackById",
        ...audioTrackById,
    };
}

function createSelectAudioTrackByAttribute(audioTrackByAttribute) {
    return {
        odataType: "#Microsoft.Media.SelectAudioTrackByAttribute",
        ...audioTrackByAttribute,
    };
}

function createInputFile(inputFile) {
    return {
        odataType: "#Microsoft.Media.InputFile",
        ...inputFile,
    };
}

function createFromAllInputFile(fromAllInputFile) {
    return {
        odataType: "#Microsoft.Media.FromAllInputFile",
        ...fromAllInputFile,
    };
}

function createFromEachInputFile(fromEachInputFile) {
    return {
        odataType: "#Microsoft.Media.FromEachInputFile",
        ...fromEachInputFile,
    };
}

function createJobInputAsset(inputAsset) {
    return {
        odataType: "#Microsoft.Media.JobInputAsset",
        ...inputAsset,
    };
}

function createJobInputClip(inputAsset) {
    return {
        odataType: "#Microsoft.Media.JobInputClip",
        ...inputAsset,
    };
}

function createJobInputHttp(inputHttp) {
    return {
        odataType: "#Microsoft.Media.JobInputHttp",
        ...inputHttp,
    };
}

function createJobOutputAsset(outputAsset) {
    return {
        odataType: "#Microsoft.Media.JobOutputAsset",
        ...outputAsset,
    };
}

function createJobInputSequence(jobInputSequence) {
    return {
        odataType: "#Microsoft.Media.JobInputSequence",
        ...jobInputSequence,
    };
}

function createJobInputs(jobInputs) {
    return {
        odataType: "#Microsoft.Media.JobInputs",
        ...jobInputs,
    };
}

function createVideoOverlay(videoOverlay) {
    return {
        odataType: "#Microsoft.Media.VideoOverlay",
        ...videoOverlay,
    };
}

module.exports = {
    createCopyVideo,
    createCopyAudio,
    createH264Video,
    createH264Layer,
    createH265Video,
    createH265Layer,
    createAACaudio,
    createPngImage,
    createPngLayer,
    createPngFormat,
    createJpgImage,
    createJpgLayer,
    createJpgFormat,
    createStandardEncoderPreset,
    createBuiltInStandardEncoderPreset,
    createAudioAnalyzerPreset,
    createVideoAnalyzerPreset,
    createMp4Format,
    createTSFormat,
    createSelectAudioTrackById,
    createSelectAudioTrackByAttribute,
    createInputFile,
    createFromAllInputFile,
    createFromEachInputFile,
    createJobInputAsset,
    createJobInputClip,
    createJobInputHttp,
    createJobOutputAsset,
    createJobInputSequence,
    createJobInputs,
    createVideoOverlay,
};
