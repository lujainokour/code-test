$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:TEMP ('cm-services-input-' + [guid]::NewGuid().ToString('N'))
$chrome = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless','--disable-gpu','--no-first-run','--remote-debugging-port=0',('--user-data-dir=' + $profile),'about:blank') -WindowStyle Hidden -PassThru
$socket = New-Object System.Net.WebSockets.ClientWebSocket
try {
    $portFile = Join-Path $profile 'DevToolsActivePort'
    for ($attempt=0; $attempt -lt 80 -and !(Test-Path $portFile); $attempt++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content $portFile)[0]
    $targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
    $target = $targets | Where-Object {$_.type -eq 'page'} | Select-Object -First 1
    $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $script:sequence=0
    function Cdp($method,$parameters) {
        $script:sequence++; $id=$script:sequence
        $bytes=[Text.Encoding]::UTF8.GetBytes((@{id=$id;method=$method;params=$parameters}|ConvertTo-Json -Depth 12 -Compress))
        $socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
        do {
            $stream=New-Object IO.MemoryStream
            do { $buffer=New-Object byte[] 65536; $part=$socket.ReceiveAsync([ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult(); $stream.Write($buffer,0,$part.Count) } while (!$part.EndOfMessage)
            $response=[Text.Encoding]::UTF8.GetString($stream.ToArray())|ConvertFrom-Json; $stream.Dispose()
        } while ($response.id -ne $id)
        if ($response.error) {throw ($response.error|ConvertTo-Json)}
        return $response.result
    }
    function Eval($expression) { $result=Cdp 'Runtime.evaluate' @{expression=$expression;returnByValue=$true;awaitPromise=$true}; if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6)}; return $result.result.value }
    foreach($width in @(1366,390)){
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=900;deviceScaleFactor=1;mobile=$false}|Out-Null
        Cdp 'Page.navigate' @{url='http://127.0.0.1:8765/index.html'}|Out-Null
        Start-Sleep -Milliseconds 1200
        Eval "scrollTo({top:0,behavior:'instant'});true"|Out-Null
        $info=Eval "(()=>{const v=document.getElementById('hero-background-video'),h=document.getElementById('hero-title'),r=v.getBoundingClientRect();return{viewport:innerWidth,title:getComputedStyle(h).color,titleOpacity:getComputedStyle(h).opacity,titleRect:h.getBoundingClientRect().toJSON(),video:{width:r.width,height:r.height,ready:v.readyState,error:v.error?.message,paused:v.paused,videoWidth:v.videoWidth,currentTime:v.currentTime},hero:getComputedStyle(document.querySelector('.hero-video-shell')).backgroundColor}})()"
        $info|ConvertTo-Json -Depth 5
        $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path ('previews/hero-restored-'+$width+'.png')),[Convert]::FromBase64String($shot.data))
    }
}finally{$socket.Dispose();if(!$chrome.HasExited){Stop-Process -Id $chrome.Id}}
