sub init()
    print "--- [TASK] VideoFetcher Node Initialized in memory"
end sub

sub runTask()
    ' This print confirms the thread is actually running
    print "--- [TASK] Thread execution STARTED"
    
    ' 1. CONFIG
    phoneIp = "10.46.133.183"
    port = "8080"
    serverUrl = "http://" + phoneIp + ":" + port
    
    ' 2. ROUTING
    if m.top.requestType = "search"
        url = serverUrl + "/search?q=" + m.top.payload.EncodeUriComponent()
    else
        url = serverUrl + "/video/" + m.top.payload
    end if
    
    print "--- [TASK] Attempting connection to: " + url
    
    ' 3. HTTP SETUP
    http = CreateObject("roUrlTransfer")
    http.SetUrl(url)
    http.EnablePeerVerification(false)
    http.EnableHostVerification(false)
    
    msgPort = CreateObject("roMessagePort")
    http.SetPort(msgPort)
    
    ' 4. NETWORK CALL
    if http.AsyncGetToString()
        print "--- [TASK] Request sent. Waiting for response..."
        
        ' Wait up to 30 seconds for Orbot latency
        msg = Wait(30000, msgPort)
        
        if Type(msg) = "roUrlEvent"
            resCode = msg.GetResponseCode()
            print "--- [TASK] Server responded with code: "; resCode
            
            if resCode = 200
                raw = msg.GetString()
                json = ParseJson(raw)
                if json <> invalid
                    m.top.results = { "data": json, "type": m.top.requestType }
                    print "--- [TASK] Data successfully sent to UI"
                else
                    print "--- [ERR] TASK: JSON parsing failed"
                end if
            end if
        else
            print "--- [ERR] TASK: Request timed out (Orbot/Termux down?)"
            http.AsyncCancel()
        end if
    else
        print "--- [ERR] TASK: AsyncGetToString failed to start"
    end if
end sub
