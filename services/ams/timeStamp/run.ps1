param($eventGridEvent, $TriggerMetadata)

# START - Hard coding in variables as these are unlikely to change.
$resourceGroupName = 'pre-sbox' # resource group name
$azureAMSAccount = 'preamssbox' # ams account name
$storageAccountName = "prefinalsasbox" # storage account
$videoFile = "video_2000000_1920x1080_6750.mp4"
$vTTFile = ".\video_2000000_1920x1080_6750.vtt"
$manifestFile = "video_2000000_manifest.json"

# setup VTT output
$buildVTT = @()
$buildVTT += 'WEBVTT'
$buildVTT += ''
# setup VTT output
# END

# Manipulate Asset name to get Container ID
$assetName = $eventGridEvent.data.output.assetName # asset name
Write-Host "Asset Name = " $assetName
$containerName = $assetName.Substring(0, $assetName.IndexOf('_')) # trim _
$containerName = $containerName.Insert(8, '-') # add -
$containerName = $containerName.Insert(13, '-') # add -
$containerName = $containerName.Insert(18, '-') # add -
$containerName = $containerName.Insert(23, '-') # add -
Write-Host "Container Name = " $containerName

$startTime = Get-Date #-Format "dd/MM/yyyy HH:mm:ss"
$endTime = $startTime.AddHours(2.0)

#######################################################
########        Event Audit Data - Import      ########
#######################################################
$eventAuditstorageContext = $null
$eventAuditStorageAccountName = "presasbox"
$eventAuditContainerName = "timestamp-repo"
$eventAuditStartTime = Get-Date
$eventAuditEndTime = $eventAuditStartTime.AddHours(2.0)
$eventAuditDataFile = $assetName.Substring(0, $assetName.IndexOf('_'))+".csv"
$eventAuditFileExists = $null
$eventAuditLogDetails = $null
$eventStartTimesForVTT = @()
$eventEndTimesForVTT = @()
$global:totalSecondCount = 1
$global:getDurationTicker = 0
$global:TickerStart = 0
$global:TickerEnd = 0

try {
        Write-Host "Connecting to Repo Storage Account now with new token..."
        $eventAuditRslt = Get-AzStorageAccount -Name $eventAuditStorageAccountName -ResourceGroupName $resourceGroupName | New-AzStorageContainerSASToken  -Container $eventAuditContainerName -Permission rwcl -ExpiryTime $eventAuditEndTime
        [Environment]::SetEnvironmentVariable("SAST",$eventAuditRslt.TrimStart("?"))
        Write-Host "New token generated - will expire in 2 hrs"
        $logOutputObj = New-Object -TypeName PSObject
}
catch {
    [String]$message = "Problem connecting to storage account. '$($_.Exception.Message)'"
    throw $message
}
if ($eventAuditRslt) {
    try {
        Write-Host "Getting Event Audit Storage Context..."
        $eventAuditstorageContext = New-AzStorageContext -StorageAccountName $eventAuditStorageAccountName -SasToken $eventAuditRslt -ErrorAction Stop
        Write-Host "Storage Ctx: " $eventAuditstorageContext.StorageAccountName
    }
    catch {
        [String]$message = "Unable to get context on storage account: '$($_.Exception.Message)'"
        throw $message
    }
    try{
        # get audit file from repo
        $eventAuditFileExists = Get-AzStorageBlobContent -Container $eventAuditContainerName -Blob $eventAuditDataFile -Context $eventAuditstorageContext -Force -ErrorAction SilentlyContinue
        if($eventAuditFileExists -ne $null){
            Write-Host "Event Audit found."
            # consume the raw data from the CSV in the repo - this will allow us to get the timestamps for creating the VTT
            $eventAuditLogDetails = $eventAuditFileExists
            $eventAuditLogDetails = $eventAuditLogDetails.ICloudBlob.DownloadText()

            # convert the raw data into CSV format so we can iterate through the values by headers allowing us to pick out the times
            $csvHeaders = "Event","EventTime","EventSubject"
            $eAL_Csv = $eventAuditLogDetails | ConvertFrom-Csv -header $csvHeaders | Select-Object -Unique * #CC
        }
    }
    catch{
        [String]$message = "There was an error finding existing file: '$($_.Exception.Message)'"
        throw $message
    }
}
#######################################################
########        Event Audit Data - Import      ########
#######################################################

function produceVTT ($startT,$endT, $tickStart){

    if($startT -ne $null -Or $endT -ne $null){

        $buildArray = @()
        Write-Host "line 98"
        $factualStart = $startT.ToString()
        $factualStart = $factualStart.Substring($factualStart.IndexOf(" ")+1)
        #Write-Host "line 94"
        $factualEnd = $endT.ToString()
        $factualEnd = $factualEnd.Substring($factualEnd.IndexOf(" ")+1)
        $global:totalSecondCount = $tickStart

        #Write-Host "Line 98"
        $fOriginalStart = $factualStart
        #Write-Host "Line 100"
        $factualStart = Get-Date $factualStart -Format "HH:mm:ss"

        $factualEnd = Get-Date $factualEnd -Format "HH:mm:ss"
        $fduration = New-Timespan –Start $factualStart -End $factualEnd | Select TotalSeconds

        for ($i = 1; $i -le $fduration.TotalSeconds; $i++) {

            $fAddSeconds = Get-Date $factualStart #
            $fAddSeconds = $fAddSeconds.AddSeconds($i) #
            $fSnapTime = $fAddSeconds #

            $fOriginalStart = Get-Date $fOriginalStart -Format "HH:mm:ss"

            $fAddSeconds = Get-Date $fAddSeconds -Format "HH:mm:ss"

            $buildArray += $global:totalSecondCount.ToString()
            Write-Host "Line 118"
            $timeSpanStart = New-TimeSpan -Seconds ($global:totalSecondCount - 1)
            $timeSpanEnd = New-TimeSpan -Seconds $global:totalSecondCount
            $timeStringStart = "{0:hh\:mm\:ss}" -f $timeSpanStart
            $timeStringEnd = "{0:hh\:mm\:ss}" -f $timeSpanEnd
            $buildArray += "$($timeStringStart).000 --> $($timeStringEnd).000 position:100% align:end"
            $test = "$($timeStringStart).000 --> $($timeStringEnd).000 position:100% align:end"
            Write-Host $test
            Write-Host "Line 120"
            $buildArray += $fSnapTime
            $buildArray += ''
            #Write-Host "Line 122"
            $fOriginalStart = $fAddSeconds #

            $global:totalSecondCount++
        }
    }
    return $buildArray
}

try {
    Write-Host "Attempting connection to AMS..." -ForegroundColor Green
    try {

        #https://www.cirriustech.co.uk/blog/az-psfunction-generate-sas-tokens/
        Write-Host "Connecting to Storage Account now with new token..."
        $result = Get-AzStorageAccount -Name $storageAccountName -ResourceGroupName $resourceGroupName | New-AzStorageContainerSASToken  -Container $containerName -Permission rwcl -ExpiryTime $endTime
        [Environment]::SetEnvironmentVariable("SAST", $result.TrimStart("?"))
        Write-Host "New token generated - will expire in 2 hours"
    }
    catch {
        [String]$message = "Problem connecting to storage account. '$($_.Exception.Message)'"
        throw $message
    }
    if ($result) {
        try {
            Write-Host "Getting Storage Context..."
            $storageContext = New-AzStorageContext -StorageAccountName $storageAccountName -SasToken $result -ErrorAction Stop
            Write-Host "Storage Ctx: " $storageContext.StorageAccountName
        }
        catch {
            [String]$message = "Unable to get context on storage account: '$($_.Exception.Message)'"
            throw $message
        }
        try {
            Write-Host "Getting Storage Blob..."
            $blob = Get-AzStorageBlob -Context $storageContext -Container $containerName -Blob $videoFile -ErrorAction Stop
            Write-Host "Blob: " $blob.BlobProperties.ContentLength
        }
        catch {
            [String]$message = "Unable to find VideoFile: '$($_.Exception.Message)'"
            throw $message
        }
        if ($blob) {

            Write-Host "Code-Line 150 - Implementing loop through of audit file."
            foreach($logdetail in $eAL_Csv){

                Write-Host "********* Event $($logdetail.Event)"
                Write-Host "********* EventTime $($logdetail.EventTime)"
                Write-Host "********* EventSub $($logdetail.EventSubject)"

                if($logdetail.Event -eq "Microsoft.Media.LiveEventIncomingStreamReceived"){
                    $eventStartTimesForVTT += $logdetail.EventTime
                }
                if($logdetail.Event -eq "Microsoft.Media.LiveEventEncoderDisconnected"){
                    $eventEndTimesForVTT += $logdetail.EventTime
                }
            }
            Write-Host "-------------------------------------------------"
            Write-Host "Start Times to note are: $($eventStartTimesForVTT)"
            Write-Host "End Times to note are: $($eventEndTimesForVTT)"

            for($g=0; $g -le $eventStartTimesForVTT.Length; $g++){

                $getStartDateTime = $eventStartTimesForVTT[$g]
                $getEndDateTime = $eventEndTimesForVTT[$g]

                if($getStartDateTime -ne $null -Or $getEndDateTime -ne $null){
                    #$rawStartTime = $getStartDateTime.Substring($getStartDateTime.IndexOf(" ")+1)
                    Write-Host "Line 186"
                    $rawStartTime = $getStartDateTime
                    #$rawStartTime = Get-Date $getStartDateTime -Format "dd/MM/yyyy HH:mm:ss"
                    Write-Host "raw Start - $($rawStartTime)"
                    $rawStart = $getStartDateTime.Substring($getStartDateTime.IndexOf(" ")+1)
                    $aStart = Get-Date $rawStart -Format T
                    $actualStart = $rawStartTime

                    #$rawEndTime = $getEndDateTime.Substring($getEndDateTime.IndexOf(" ")+1)
                    Write-Host "Line 193"
                    $rawEndTime = $getEndDateTime
                    #$rawEndTime = Get-Date $getEndDateTime -Format "dd/MM/yyyy HH:mm:ss"
                    Write-Host "raw End - $($rawEndTime)"
                    $rawEnd = $getEndDateTime.Substring($getEndDateTime.IndexOf(" ")+1)
                    $aEnd = Get-Date $rawEnd -Format T
                    $actualEnd = $rawEndTime

                    $getDurTicker = New-Timespan –Start $aStart -End $aEnd | Select TotalSeconds
                    if($getDurTicker -ne $getDurationTicker){
                        $global:TickerStart = $global:TickerEnd  + 1

                        $global:TickerEnd = $getDurTicker.TotalSeconds
                    }
                    Write-Host "Calling function to build VTT"
                    try{
                        Write-Host "Line 201"
                        Write-Host "Actual Start - $($actualStart) - Actual End - $($actualEnd)"
                        #produceVTT $rawStartTime $rawEndTime
                        $buildVTT += produceVTT $rawStartTime $rawEndTime $global:TickerStart
                        Write-Host "VTT Details: $buildVTT"
                    }
                    catch{
                        [String]$message = "Function failed: '$($_.Exception.Message)'"
                        throw $message
                    }
                }
            }
            ###########################################################################################################
            ################################ Export VTT ###############################################################
            ###########################################################################################################
            try{
                # Export file
                $vttFileStr = $buildVTT | Out-String -ErrorAction SilentlyContinue
                $tempFile = New-TemporaryFile
                [io.file]::WriteAllText($tempFile, $vttFileStr)

                #Upload new VTT file
                Set-AzStorageBlobContent -Container $containerName -File $tempFile -Blob $vTTFile -context $storageContext -ErrorAction Stop -Force #overwrite
            }
            catch{
                [String]$message = "Failed to save the VTT file: '$($_.Exception.Message)'"
                throw $message
            }
        }
    }
}
catch{
    [String]$message = "Global Failure: '$($_.Exception.Message)'"
    throw $message
}

