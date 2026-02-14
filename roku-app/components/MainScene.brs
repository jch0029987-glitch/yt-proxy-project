sub init()
    m.videoGrid = m.top.findNode("videoGrid")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.errorLabel = m.top.findNode("errorLabel")
    m.menuList = m.top.findNode("menuList")
    m.sectionTitle = m.top.findNode("sectionTitle")

    m.menuList.focusBitmapBlendColor = "0xFF0000FF"
    m.videoGrid.focusBitmapBlendColor = "0xFFFFFFFF"

    menuContent = createObject("roSGNode", "ContentNode")
    for each itemTitle in ["Home", "Search", "Trending"]
        item = menuContent.createChild("ContentNode")
        item.title = itemTitle
    end for
    m.menuList.content = menuContent

    m.videoGrid.observeField("itemSelected", "onVideoSelected")
    m.menuList.observeField("itemSelected", "onMenuSelected")
    
    ' NETWORK OPTIMIZATION: Observe track changes for autoplay
    m.videoPlayer.observeField("contentIndex", "onTrackChanged")
    m.videoPlayer.observeField("state", "onPlayerStateChange")

    m.menuList.setFocus(true)
    fetchData("search", "trending")
end sub

' --- Playlist & Autoplay Logic ---
sub onVideoSelected()
    gridContent = m.videoGrid.content
    selectedIndex = m.videoGrid.itemSelected
    
    ' Build a Playlist Queue from current grid
    playlist = createObject("roSGNode", "ContentNode")
    for i = selectedIndex to gridContent.getChildCount() - 1
        item = gridContent.getChild(i)
        node = playlist.createChild("ContentNode")
        node.setFields({
            title: item.title,
            id: item.id,
            streamformat: "mp4"
        })
    end for

    m.videoPlayer.setFields({
        content: playlist,
        contentIsPlaylist: true,
        visible: true
    })
    
    ' Fetch first video details
    fetchData("details", gridContent.getChild(selectedIndex).id)
    m.videoPlayer.setFocus(true)
end sub

' When the video ends and next starts, fetch new URL automatically
sub onTrackChanged()
    if m.videoPlayer.content <> invalid
        currentVideo = m.videoPlayer.content.getChild(m.videoPlayer.contentIndex)
        if currentVideo <> invalid and currentVideo.url = ""
            print "--- [NET] Autoplay: Fetching next URL for " + currentVideo.title
            fetchData("details", currentVideo.id)
        end if
    end if
end sub

sub onPlayerStateChange()
    if m.videoPlayer.state = "error"
        m.errorLabel.text = "Tor Stream Error - Retrying..."
        m.errorLabel.visible = true
    end if
end sub

' --- Quality/Details Handling ---
sub onDataReceived(event as Object)
    results = event.getData()
    if results = invalid or results.data = invalid then return

    if results.type = "search"
        m.errorLabel.visible = false
        content = createObject("roSGNode", "ContentNode")
        for each item in results.data
            node = content.createChild("ContentNode")
            node.setFields({
                title: item.title,
                id: item.id,
                hdPosterUrl: item.thumbnail,
                fhdPosterUrl: item.thumbnail
            })
            content.appendChild(node)
        end for
        m.videoGrid.content = content
    else if results.type = "details"
        m.errorLabel.visible = false
        ' If we are already playing a playlist, just update the URL and play
        if m.videoPlayer.visible
            updatePlaylistUrl(results.data)
        else
            showQualityDialog(results.data)
        end if
    end if
end sub

sub updatePlaylistUrl(data as Object)
    ' Find the specific node in the queue and inject the URL
    if data.formats <> invalid and data.formats.Count() > 0
        ' Use the first (highest) format for autoplay
        url = data.formats[0].url
        m.videoPlayer.content.getChild(m.videoPlayer.contentIndex).url = url
        m.videoPlayer.control = "play"
    end if
end sub

' --- Existing Quality UI ---
sub showQualityDialog(data as Object)
    m.currentVideoData = data
    dialog = createObject("roSGNode", "Dialog")
    buttons = []
    if data.formats <> invalid
        for each format in data.formats
            buttons.push(format.qualityLabel)
        end for
    end if
    buttons.push("Cancel")
    dialog.setFields({ title: "Select Quality", message: data.title, buttons: buttons })
    dialog.observeField("buttonSelected", "onQualitySelected")
    m.top.getScene().dialog = dialog
end sub

sub onQualitySelected(event as Object)
    idx = event.getData()
    m.top.getScene().dialog = invalid
    if idx < m.currentVideoData.formats.Count()
        selection = m.currentVideoData.formats[idx]
        ' Update the actual playlist node's URL
        m.videoPlayer.content.getChild(m.videoPlayer.contentIndex).url = selection.url
        m.videoPlayer.control = "play"
    end if
end sub

' --- General Helpers ---
sub fetchData(reqType as String, payload as String)
    m.task = createObject("roSGNode", "VideoFetcher")
    if m.task <> invalid
        m.task.setFields({ requestType: reqType, payload: payload, functionName: "runTask" })
        m.task.observeField("results", "onDataReceived")
        m.task.control = "RUN"
    end if
end sub

sub onMenuSelected()
    section = m.menuList.content.getChild(m.menuList.itemSelected).title
    m.sectionTitle.text = section
    if section = "Search" then openSearchKeyboard() else fetchData("search", LCase(section))
end sub

sub openSearchKeyboard()
    keyboard = createObject("roSGNode", "StandardKeyboardDialog")
    keyboard.setFields({ title: "Search YouTube", buttons: ["Search", "Cancel"] })
    keyboard.observeField("buttonSelected", "onSearchConfirm")
    m.top.getScene().dialog = keyboard
end sub

sub onSearchConfirm(event as Object)
    idx = event.getData()
    dialog = m.top.getScene().dialog
    if idx = 0 and dialog <> invalid then fetchData("search", dialog.text)
    m.top.getScene().dialog = invalid
    m.videoGrid.setFocus(true)
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false
    if key = "back"
        if m.videoPlayer.visible
            m.videoPlayer.control = "stop"
            m.videoPlayer.visible = false
            m.videoGrid.setFocus(true)
            return true
        else if m.videoGrid.hasFocus()
            m.menuList.setFocus(true)
            return true
        end if
    else if key = "right" and m.menuList.hasFocus()
        m.videoGrid.setFocus(true)
        return true
    else if key = "left" and m.videoGrid.hasFocus()
        m.menuList.setFocus(true)
        return true
    end if
    return false
end function
