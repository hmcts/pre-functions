param($eventGridEvent, $TriggerMetadata)
################################################################################################################################
########################### HEADER #############################################################################################
################################################################################################################################

# This function is designed to consume the event details passed from AMS.
# We are specifically looking at a number of events as follows:
# Microsoft.Media.LiveEventIngestHeartbeat #
# Microsoft.Media.LiveEventEncoderConnected #
# Microsoft.Media.LiveEventIncomingStreamReceived #
# Microsoft.Media.LiveEventEncoderDisconnected #
# Microsoft.Media.LiveEventTrackDiscontinuityDetected #
#
# Pending the live event, this function will log datetimes
# This function will then build a file to store in a storage container ready for the VTT builder

# Global Vars
$resourceGroupName = 'pre-sbox' # resource group name
$storageAccountName = "presasbox" # ingest storage account
$containerName = "timestamp-repo"
$startTime = Get-Date #-Format "dd/MM/yyyy HH:mm:ss"
$endTime = $startTime.AddSeconds(10.0)
$logFile = ""
$buildLogFile = @()
$ingestURL = ""
$containerID = ""
$logDetails = @()
$fileExists = $null
$comma = ","
$eventType = ""
$eventTime = $null
$eventSubject = ""

# Global Vars
################################################################################################################################
########################### HEADER #############################################################################################
###############################################################################################################################

try{
    Write-Host "Event - $($eventGridEvent.eventType)"
    # Get Storage Container ID
    If($eventGridEvent.data.ingestUrl -ne $null){
        $ingestURL = $eventGridEvent.data.ingestUrl.ToString()
        $containerID = $ingestURL.Substring(8)
        $containerID = $containerID.Substring(0,$containerID.IndexOf("-"))
        Write-Host "Container & Recording ID : $($containerID)"
        # Connect to AMS storage for creating log file
        try {
            #https://www.cirriustech.co.uk/blog/az-psfunction-generate-sas-tokens/
            Write-Host "Connecting to Storage Account now with new token..."
            $rslt = Get-AzStorageAccount -Name $storageAccountName -ResourceGroupName $resourceGroupName | New-AzStorageContainerSASToken  -Container $containerName -Permission rwcl -ExpiryTime $endTime
            [Environment]::SetEnvironmentVariable("SAST",$rslt.TrimStart("?"))
            Write-Host "New token generated - will expire in 10 seconds"
        }
        catch {
            [String]$message = "Problem connecting to storage account. '$($_.Exception.Message)'"
            throw $message
        }
        # If token exists
        if ($rslt) {
            # Get storage context
            try {
                Write-Host "Getting Storage Context..."
                $storageContext = New-AzStorageContext -StorageAccountName $storageAccountName -SasToken $rslt -ErrorAction Stop
                Write-Host "Storage Ctx: " $storageContext.StorageAccountName
            }
            catch {
                [String]$message = "Unable to get context on storage account: '$($_.Exception.Message)'"
                throw $message
            }
            Write-Host "Line 72"
            # Get file if exists
            try{
                $logFile = $containerID+".csv"
                Write-Host "Can existing file be found?"
                $fileExists = Get-AzStorageBlobContent -Container $containerName -Blob $logFile -Context $storageContext -Force -ErrorAction SilentlyContinue
                Write-Host "File details $($fileExists)"
                if($fileExists -ne $null){
                    Write-Host "File found ------ $($fileExists)"
                    $logDetails = $fileExists
                    $logDetails = $logDetails.ICloudBlob.DownloadText()
                    Write-Host "Log Details = $($logDetails)"

                    if($logDetails -ne $null){
                        Write-Host "Removing existing blob"
                        Remove-AzStorageBlob -Container $containerName -Blob $logFile -Context $storageContext -Force -ErrorAction SilentlyContinue
                    }
                }
                else{
                    Write-Host "No existing file found."
                    # Add headers to the CSV file
                    $logDetails = "Event,EventTime,EventSubject, `n"
                }
            }
            catch{
                [String]$message = "There was an error finding existing file: '$($_.Exception.Message)'"
                throw $message
            }
            Write-Host "Line 105"
            # Event type Ingest Heartbeat
            if($eventGridEvent.eventType -eq "Microsoft.Media.LiveEventIngestHeartbeat")
            {
                try{
                    Write-Host "Logging values for LiveEventIngestHeartbeat"
                    Write-Host "Event Type: $($eventGridEvent.eventType)"
                    Write-Host "Event Time: $($eventGridEvent.eventTime)"
                    Write-Host "Subject: $($eventGridEvent.subject)"

                    $eTime = Get-Date $eventGridEvent.eventTime -Format "dd/MM/yyyy HH:mm:ss"

                    $eventType = $eventGridEvent.eventType.ToString()+$comma
                    $eventTime = $eTime.ToString()+$comma
                    $eventSubject = $eventGridEvent.subject.ToString()+$comma

                    $item = New-Object PSObject
                    $item | Add-Member -type NoteProperty -Name 'EventType' -Value $eventGridEvent.eventType
                    $item | Add-Member -type NoteProperty -Name 'EventTime' -Value $eventGridEvent.eventTime
                    $item | Add-Member -type NoteProperty -Name 'EventSubject' -Value $eventGridEvent.subject

                    #$logDetails += $item
                    $logDetails += $eventType + $eventTime + $eventSubject
                }
                catch{
                    [String]$message = "Problem logging the LiveEventIngestHeartbeat event. '$($_.Exception.Message)'"
                    throw $message
                }

            }
            Write-Host "Line 131"
            # Event type Live Event Encoder Connected
            if($eventGridEvent.eventType -eq "Microsoft.Media.LiveEventEncoderConnected")
            {
                try
                {
                    Write-Host "Logging values for LiveEventIngestHeartbeat"
                    Write-Host "Event Type: $($eventGridEvent.eventType)"
                    Write-Host "Event Time: $($eventGridEvent.eventTime)"
                    Write-Host "Subject: $($eventGridEvent.subject)"

                    $eTime = Get-Date $eventGridEvent.eventTime -Format "dd/MM/yyyy HH:mm:ss"

                    $eventType = $eventGridEvent.eventType.ToString()+$comma
                    $eventTime = $eTime.ToString()+$comma
                    $eventSubject = $eventGridEvent.subject.ToString()+$comma

                    $item = New-Object PSObject
                    $item | Add-Member -type NoteProperty -Name 'EventType' -Value $eventGridEvent.eventType
                    $item | Add-Member -type NoteProperty -Name 'EventTime' -Value $eventGridEvent.eventTime
                    $item | Add-Member -type NoteProperty -Name 'EventSubject' -Value $eventGridEvent.subject

                    #$logDetails += $item
                    $logDetails += $eventType + $eventTime + $eventSubject
                }
                catch{
                    [String]$message = "Problem logging the LiveEventEncoderConnected event. '$($_.Exception.Message)'"
                    throw $message
                }
            }
            Write-Host "Line 166"
            # Event type Live Event Incoming Stream Received
            if($eventGridEvent.eventType -eq "Microsoft.Media.LiveEventIncomingStreamReceived")
            {
                try
                {
                    Write-Host "Logging values for LiveEventIngestHeartbeat"
                    Write-Host "Event Type: $($eventGridEvent.eventType)"
                    Write-Host "Event Time: $($eventGridEvent.eventTime)"
                    Write-Host "Subject: $($eventGridEvent.subject)"

                    $eTime = Get-Date $eventGridEvent.eventTime -Format "dd/MM/yyyy HH:mm:ss"

                    $eventType = $eventGridEvent.eventType.ToString()+$comma
                    $eventTime = $eTime.ToString()+$comma
                    $eventSubject = $eventGridEvent.subject.ToString()+$comma

                    $item = New-Object PSObject
                    $item | Add-Member -type NoteProperty -Name 'EventType' -Value $eventGridEvent.eventType
                    $item | Add-Member -type NoteProperty -Name 'EventTime' -Value $eventGridEvent.eventTime
                    $item | Add-Member -type NoteProperty -Name 'EventSubject' -Value $eventGridEvent.subject

                    #$logDetails += $item
                    $logDetails += $eventType + $eventTime + $eventSubject
                }
                catch{
                    [String]$message = "Problem logging the LiveEventIncomingStreamReceived event. '$($_.Exception.Message)'"
                    throw $message
                }
            }
            Write-Host "Line 175"
            # Event type Live Event Encoder Disconnected
            if($eventGridEvent.eventType -eq "Microsoft.Media.LiveEventEncoderDisconnected")
            {
                try
                {
                    Write-Host "Logging values for LiveEventIngestHeartbeat"
                    Write-Host "Event Type: $($eventGridEvent.eventType)"
                    Write-Host "Event Time: $($eventGridEvent.eventTime)"
                    Write-Host "Subject: $($eventGridEvent.subject)"

                    $eTime = Get-Date $eventGridEvent.eventTime -Format "dd/MM/yyyy HH:mm:ss"

                    $eventType = $eventGridEvent.eventType.ToString()+$comma
                    $eventTime = $eTime.ToString()+$comma
                    $eventSubject = $eventGridEvent.subject.ToString()+$comma

                    $item = New-Object PSObject
                    $item | Add-Member -type NoteProperty -Name 'EventType' -Value $eventGridEvent.eventType
                    $item | Add-Member -type NoteProperty -Name 'EventTime' -Value $eventGridEvent.eventTime
                    $item | Add-Member -type NoteProperty -Name 'EventSubject' -Value $eventGridEvent.subject

                    #$logDetails += $item
                    $logDetails += $eventType + $eventTime + $eventSubject
                }
                catch{
                    [String]$message = "Problem logging the LiveEventEncoderDisconnected event. '$($_.Exception.Message)'"
                    throw $message
                }
            }
            Write-Host "Line 203"
            # Event type Live Event Track Discontinuity Detected
            if($eventGridEvent.eventType -eq "Microsoft.Media.LiveEventTrackDiscontinuityDetected")
            {
                try
                {
                    Write-Host "Logging values for LiveEventIngestHeartbeat"
                    Write-Host "Event Type: $($eventGridEvent.eventType)"
                    Write-Host "Event Time: $($eventGridEvent.eventTime)"
                    Write-Host "Subject: $($eventGridEvent.subject)"

                    $eTime = Get-Date $eventGridEvent.eventTime -Format "dd/MM/yyyy HH:mm:ss"

                    $eventType = $eventGridEvent.eventType.ToString()+$comma
                    $eventTime = $eTime.ToString()+$comma
                    $eventSubject = $eventGridEvent.subject.ToString()+$comma

                    $item = New-Object PSObject
                    $item | Add-Member -type NoteProperty -Name 'EventType' -Value $eventGridEvent.eventType
                    $item | Add-Member -type NoteProperty -Name 'EventTime' -Value $eventGridEvent.eventTime
                    $item | Add-Member -type NoteProperty -Name 'EventSubject' -Value $eventGridEvent.subject

                    #$logDetails += $item
                    $logDetails += $eventType + $eventTime + $eventSubject
                }
                catch{
                    [String]$message = "Problem logging the LiveEventTrackDiscontinuityDetected event. '$($_.Exception.Message)'"
                    throw $message
                }
            }
            try{
                if($logDetails -ne $null){
                    # Export file
                    $logFile = $containerID+".csv"
                    $logFileStr = $logDetails | Out-String -ErrorAction SilentlyContinue
                    $tempFile = New-TemporaryFile
                    [io.file]::WriteAllText($tempFile,$logFileStr)

                    #Upload new file
                    Set-AzStorageBlobContent -Container $containerName -File $tempFile -Blob $logFile -context $storageContext -BlobType Append -Force -ErrorAction Stop
                    Exit
                }
            }
            catch{
                    [String]$message = "Failed to write the log file out. '$($_.Exception.Message)'"
                    throw $message
            }
        }
    }
}
catch{
        [String]$message = "Complete failure. '$($_.Exception.Message)'"
        throw $message
}
