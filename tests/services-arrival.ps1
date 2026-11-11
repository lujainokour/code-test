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
    $checks=@(); $measurements=@()
    function Check($name,$passed) { $script:checks += @{name=$name;passed=[bool]$passed} }
    $sizes=@(@{w=1280;h=720},@{w=1366;h=768},@{w=1440;h=900},@{w=1536;h=864},@{w=1024;h=768},@{w=390;h=844},@{w=320;h=740})
    foreach($size in $sizes) {
        Cdp 'Emulation.setDeviceMetricsOverride' @{width=$size.w;height=$size.h;deviceScaleFactor=1;mobile=$false} | Out-Null
        Cdp 'Emulation.setPageScaleFactor' @{pageScaleFactor=1} | Out-Null
        foreach($arrival in @('top','bottom','direct')) {
            $url='http://127.0.0.1:8765/index.html'
            if($arrival -eq 'direct'){$url+='#student-services'}
            Cdp 'Page.navigate' @{url=$url} | Out-Null
            Start-Sleep -Milliseconds 600
            if($arrival -ne 'direct') {
                if($arrival -eq 'bottom') { Eval "scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});true" | Out-Null; Start-Sleep -Milliseconds 120 }
                $mobileMenu=Eval "getComputedStyle(document.querySelector('.menu-toggle')).display!=='none'"
                if($mobileMenu) {
                    $p=Eval "(()=>{const r=document.querySelector('.menu-toggle').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()"
                    Cdp 'Input.dispatchMouseEvent' @{type='mousePressed';x=$p.x;y=$p.y;button='left';clickCount=1} | Out-Null
                    Cdp 'Input.dispatchMouseEvent' @{type='mouseReleased';x=$p.x;y=$p.y;button='left';clickCount=1} | Out-Null
                    Start-Sleep -Milliseconds 250
                }
                $p=Eval "(()=>{const r=document.querySelector('#navigation a[href*=student-services]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()"
                Cdp 'Input.dispatchMouseEvent' @{type='mousePressed';x=$p.x;y=$p.y;button='left';clickCount=1} | Out-Null
                Cdp 'Input.dispatchMouseEvent' @{type='mouseReleased';x=$p.x;y=$p.y;button='left';clickCount=1} | Out-Null
            }
            Start-Sleep -Milliseconds 1000
            Eval "new Promise(resolve=>{let last=scrollY,stable=0;const start=performance.now();const timer=setInterval(()=>{stable=Math.abs(scrollY-last)<.5?stable+1:0;last=scrollY;if(stable>=4||performance.now()-start>5000){clearInterval(timer);resolve(true)}},80)})" | Out-Null
            $m=Eval @"
(()=>{const s=document.getElementById('student-services'),h=document.querySelector('.site-header').getBoundingClientRect(),t=document.getElementById('student-services-title').getBoundingClientRect(),cards=[...s.querySelectorAll('.services-card')];return {width:innerWidth,height:innerHeight,header:h.height,headerBottom:h.bottom,sectionTop:s.getBoundingClientRect().top,titleTop:t.top,titleBottom:t.bottom,lastBottom:Math.max(...cards.map(c=>c.getBoundingClientRect().bottom)),columns:getComputedStyle(s.querySelector('.services-grid')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth,visible:cards.every(c=>getComputedStyle(c).opacity==='1'&&getComputedStyle(c).visibility==='visible'),hash:location.hash,zoom:visualViewport.scale}})()
"@
            $measurements+=@{size=($size.w.ToString()+'x'+$size.h);arrival=$arrival;metrics=$m}
            Check ($size.w.ToString()+'x'+$size.h+' '+$arrival+': title below navbar at 100%') ($m.hash -eq '#student-services' -and $m.titleTop -ge ($m.headerBottom+8) -and $m.titleBottom -lt $size.h -and $m.zoom -eq 1)
            Check ($size.w.ToString()+' '+$arrival+': no overflow or hidden cards') (!$m.overflow -and $m.visible)
            Check ($size.w.ToString()+' '+$arrival+': anchor gap matches actual header') ([Math]::Abs($m.sectionTop-$m.headerBottom-12) -le 2)
            if($size.w -ge 1280) { Check ($size.w.ToString()+'x'+$size.h+' '+$arrival+': title and four cards fit naturally') ($m.lastBottom -le $size.h -and $m.columns -eq 4) }
            if($arrival -eq 'direct' -and ($size.w -eq 1366 -or $size.w -eq 390)) {
                $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
                $name=if($size.w -eq 390){'services-arrival-mobile.png'}else{'services-arrival-laptop.png'}
                [IO.File]::WriteAllBytes((Join-Path (Get-Location).Path ('previews/'+$name)),[Convert]::FromBase64String($shot.data))
            }
        }
    }
    $result=@{passed=@($checks|Where-Object {$_.passed}).Count;total=$checks.Count;checks=$checks;measurements=$measurements}
    $result|ConvertTo-Json -Depth 10|Set-Content docs/services-arrival-results.json -Encoding UTF8
    Write-Output ($result.passed.ToString()+'/'+$result.total)
    $checks|Where-Object {!$_.passed}|ForEach-Object {Write-Output $_.name}
    $measurements|ForEach-Object {Write-Output ($_.size+' '+$_.arrival+' navbar='+$_.metrics.header+' sectionTop='+$_.metrics.sectionTop+' titleTop='+$_.metrics.titleTop+' cardsBottom='+$_.metrics.lastBottom)}
} finally { $socket.Dispose(); if(!$chrome.HasExited){Stop-Process -Id $chrome.Id} }

