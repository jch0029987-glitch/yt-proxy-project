' **************************************************************
' ** Main Entry Point for YT Proxy Roku
' **************************************************************

sub Main()
    print "--- [MAIN] Initializing Roku App"

    ' 1. Create the Screen
    ' roSGScreen is the canvas for all SceneGraph components
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.SetMessagePort(m.port)

    ' 2. Create and Show the Scene
    ' This name MUST match the name attribute in your MainScene.xml
    scene = screen.CreateScene("MainScene")
    screen.Show()
    
    print "--- [MAIN] MainScene displayed"

    ' 3. The Event Loop
    ' This keeps the app alive to handle background tasks and input
    while(true)
        ' Wait for an event (0 means wait indefinitely)
        msg = wait(0, m.port)
        msgType = type(msg)
        
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
